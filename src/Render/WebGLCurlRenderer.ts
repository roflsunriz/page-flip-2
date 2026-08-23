import { calculatePointerAlignedCreaseDistance, ReflectionCurlFold } from '../Flip/ReflectionCurl';

export const CURL_VERTICAL_PADDING_RATIO = 0.18;

const VERTEX_SHADER = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;
in vec2 aUv;
uniform vec2 uResolution;
uniform float uDepth;
out vec3 vNormal;
out vec2 vUv;
void main() {
    vec2 normalized = aPosition.xy / uResolution;
    vec2 clip = vec2(normalized.x * 2.0 - 1.0, 1.0 - normalized.y * 2.0);
    gl_Position = vec4(clip, clamp(-aPosition.z / uDepth, -1.0, 1.0), 1.0);
    vNormal = aNormal;
    vUv = aUv;
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec2 vUv;
uniform sampler2D uFront;
uniform sampler2D uBack;
uniform bool uHasBack;
uniform bool uMirrorUv;
uniform vec3 uLightDirection;
uniform float uShadowStrength;
out vec4 outputColor;
void main() {
    vec3 normal = normalize(vNormal);
    bool isFront = normal.z >= 0.0;
    vec3 lightingNormal = isFront ? normal : -normal;
    float frontU = uMirrorUv ? 1.0 - vUv.x : vUv.x;
    vec4 base = isFront
        ? texture(uFront, vec2(frontU, vUv.y))
        : (uHasBack
            ? texture(uBack, vec2(1.0 - frontU, vUv.y))
            : vec4(1.0));

    vec3 lightDirection = normalize(uLightDirection);
    float diffuse = max(dot(lightingNormal, lightDirection), 0.0);
    vec3 reflected = reflect(-lightDirection, lightingNormal);
    float specular = pow(max(dot(reflected, vec3(0.0, 0.0, 1.0)), 0.0), 80.0);
    float flatLight = 0.58 + 0.42 * max(lightDirection.z, 0.0);
    float light = (0.58 + 0.42 * diffuse) / flatLight;
    float edge = 1.0 - abs(normal.z);

    if (!isFront) light *= mix(1.0, 0.82, edge);

    vec3 rgb = base.rgb * clamp(light, 0.0, 1.3) + vec3(specular * 0.6);
    rgb = mix(rgb, vec3(0.1, 0.1, 0.12), uShadowStrength * 0.5 * edge);
    outputColor = vec4(rgb, base.a);
}`;

type GridMesh = {
    indices: Uint16Array;
    textureCoordinates: Float32Array;
    vertexCount: number;
};

const createGridMesh = (columns: number, rows: number): GridMesh => {
    const vertexWidth = columns + 1;
    const vertexHeight = rows + 1;
    const vertexCount = vertexWidth * vertexHeight;
    const textureCoordinates = new Float32Array(vertexCount * 2);

    for (let y = 0; y < vertexHeight; y += 1) {
        for (let x = 0; x < vertexWidth; x += 1) {
            const vertex = y * vertexWidth + x;
            textureCoordinates[vertex * 2] = x / columns;
            textureCoordinates[vertex * 2 + 1] = y / rows;
        }
    }

    const indices = new Uint16Array(columns * rows * 6);
    let cursor = 0;
    for (let y = 0; y < rows; y += 1) {
        for (let x = 0; x < columns; x += 1) {
            const topLeft = y * vertexWidth + x;
            const topRight = topLeft + 1;
            const bottomLeft = topLeft + vertexWidth;
            const bottomRight = bottomLeft + 1;
            indices[cursor++] = topLeft;
            indices[cursor++] = topRight;
            indices[cursor++] = bottomLeft;
            indices[cursor++] = topRight;
            indices[cursor++] = bottomRight;
            indices[cursor++] = bottomLeft;
        }
    }

    return { indices, textureCoordinates, vertexCount };
};

const compileShader = (gl: WebGL2RenderingContext, type: number, source: string): WebGLShader => {
    const shader = gl.createShader(type);
    if (shader === null) throw new Error('Unable to allocate a page-curl shader');

    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader) ?? 'unknown compilation error';
        gl.deleteShader(shader);
        throw new Error(`Page-curl shader compilation failed: ${message}`);
    }

    return shader;
};

const createTexture = (gl: WebGL2RenderingContext): WebGLTexture => {
    const texture = gl.createTexture();
    if (texture === null) throw new Error('Unable to allocate a page-curl texture');

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([255, 255, 255, 255]),
    );
    return texture;
};

/** A pointer-driven, textured cylinder curl rendered on a tessellated page. */
export class WebGLCurlRenderer {
    private readonly gl: WebGL2RenderingContext;
    private readonly program: WebGLProgram;
    private readonly vertexArray: WebGLVertexArrayObject;
    private readonly positionBuffer: WebGLBuffer;
    private readonly normalBuffer: WebGLBuffer;
    private readonly uvBuffer: WebGLBuffer;
    private readonly indexBuffer: WebGLBuffer;
    private readonly frontTexture: WebGLTexture;
    private readonly backTexture: WebGLTexture;
    private readonly textureCoordinates: Float32Array;
    private readonly indices: Uint16Array;
    private readonly positions: Float32Array;
    private readonly normals: Float32Array;
    private hasBackTexture = false;
    private width = 1;
    private height = 1;
    private paddingY = 0;

    constructor(
        private readonly canvas: HTMLCanvasElement,
        columns = 56,
        rows = 40,
    ) {
        const context = canvas.getContext('webgl2', {
            alpha: true,
            antialias: true,
            premultipliedAlpha: true,
        });
        if (context === null) throw new Error('WebGL2 is unavailable');
        this.gl = context;

        const grid = createGridMesh(columns, rows);
        this.textureCoordinates = grid.textureCoordinates;
        this.indices = grid.indices;
        this.positions = new Float32Array(grid.vertexCount * 3);
        this.normals = new Float32Array(grid.vertexCount * 3);

        const vertexShader = compileShader(context, context.VERTEX_SHADER, VERTEX_SHADER);
        const fragmentShader = compileShader(context, context.FRAGMENT_SHADER, FRAGMENT_SHADER);
        const program = context.createProgram();
        if (program === null) throw new Error('Unable to allocate the page-curl shader program');
        context.attachShader(program, vertexShader);
        context.attachShader(program, fragmentShader);
        context.linkProgram(program);
        context.deleteShader(vertexShader);
        context.deleteShader(fragmentShader);
        if (!context.getProgramParameter(program, context.LINK_STATUS)) {
            throw new Error(
                `Page-curl shader link failed: ${context.getProgramInfoLog(program) ?? 'unknown error'}`,
            );
        }
        this.program = program;

        const vertexArray = context.createVertexArray();
        const positionBuffer = context.createBuffer();
        const normalBuffer = context.createBuffer();
        const uvBuffer = context.createBuffer();
        const indexBuffer = context.createBuffer();
        if (
            vertexArray === null ||
            positionBuffer === null ||
            normalBuffer === null ||
            uvBuffer === null ||
            indexBuffer === null
        ) {
            throw new Error('Unable to allocate page-curl mesh buffers');
        }
        this.vertexArray = vertexArray;
        this.positionBuffer = positionBuffer;
        this.normalBuffer = normalBuffer;
        this.uvBuffer = uvBuffer;
        this.indexBuffer = indexBuffer;

        context.bindVertexArray(vertexArray);
        this.bindDynamicAttribute('aPosition', positionBuffer, this.positions.byteLength, 3);
        this.bindDynamicAttribute('aNormal', normalBuffer, this.normals.byteLength, 3);

        context.bindBuffer(context.ARRAY_BUFFER, uvBuffer);
        context.bufferData(context.ARRAY_BUFFER, this.textureCoordinates, context.STATIC_DRAW);
        const uvLocation = context.getAttribLocation(program, 'aUv');
        context.enableVertexAttribArray(uvLocation);
        context.vertexAttribPointer(uvLocation, 2, context.FLOAT, false, 0, 0);

        context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, indexBuffer);
        context.bufferData(context.ELEMENT_ARRAY_BUFFER, this.indices, context.STATIC_DRAW);
        context.bindVertexArray(null);

        this.frontTexture = createTexture(context);
        this.backTexture = createTexture(context);
        context.pixelStorei(context.UNPACK_FLIP_Y_WEBGL, false);
        context.pixelStorei(context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        context.enable(context.DEPTH_TEST);
        context.depthFunc(context.LEQUAL);
        context.enable(context.BLEND);
        context.blendFunc(context.ONE, context.ONE_MINUS_SRC_ALPHA);
    }

    private bindDynamicAttribute(
        name: string,
        buffer: WebGLBuffer,
        byteLength: number,
        components: number,
    ): void {
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, byteLength, gl.DYNAMIC_DRAW);
        const location = gl.getAttribLocation(this.program, name);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, components, gl.FLOAT, false, 0, 0);
    }

    public resize(width: number, height: number, pixelRatio: number): void {
        const paddingY = Math.round(height * CURL_VERTICAL_PADDING_RATIO);
        const bufferWidth = Math.max(1, Math.round(width * 2 * pixelRatio));
        const bufferHeight = Math.max(1, Math.round((height + paddingY * 2) * pixelRatio));
        this.width = width;
        this.height = height;
        this.paddingY = paddingY;

        if (this.canvas.width !== bufferWidth || this.canvas.height !== bufferHeight) {
            this.canvas.width = bufferWidth;
            this.canvas.height = bufferHeight;
            this.gl.viewport(0, 0, bufferWidth, bufferHeight);
        }
    }

    private uploadTexture(texture: WebGLTexture, source: TexImageSource): void {
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    }

    public setTextures(front: TexImageSource, back: TexImageSource | null): void {
        this.uploadTexture(this.frontTexture, front);
        this.hasBackTexture = back !== null;
        if (back !== null) this.uploadTexture(this.backTexture, back);
    }

    private computeNormals(mirror: boolean): void {
        this.normals.fill(0);
        for (let index = 0; index < this.indices.length; index += 3) {
            const a = this.indices[index] * 3;
            const b = this.indices[index + 1] * 3;
            const c = this.indices[index + 2] * 3;
            const ux = this.positions[b] - this.positions[a];
            const uy = this.positions[b + 1] - this.positions[a + 1];
            const uz = this.positions[b + 2] - this.positions[a + 2];
            const vx = this.positions[c] - this.positions[a];
            const vy = this.positions[c + 1] - this.positions[a + 1];
            const vz = this.positions[c + 2] - this.positions[a + 2];
            let nx = uy * vz - uz * vy;
            let ny = uz * vx - ux * vz;
            let nz = ux * vy - uy * vx;
            if (mirror) {
                nx = -nx;
                ny = -ny;
                nz = -nz;
            }

            for (const vertex of [a, b, c]) {
                this.normals[vertex] += nx;
                this.normals[vertex + 1] += ny;
                this.normals[vertex + 2] += nz;
            }
        }

        for (let index = 0; index < this.normals.length; index += 3) {
            const length =
                Math.hypot(this.normals[index], this.normals[index + 1], this.normals[index + 2]) ||
                1;
            this.normals[index] /= length;
            this.normals[index + 1] /= length;
            this.normals[index + 2] /= length;
        }
    }

    public draw(
        fold: ReflectionCurlFold,
        turnFromRight: boolean,
        maximumRadius: number,
        shadowStrength: number,
    ): void {
        const gl = this.gl;
        if (gl.isContextLost()) throw new Error('The page-curl WebGL context was lost');

        const progress = fold.progress / 100;
        const tail = 0.18;
        const radiusShape = progress < 1 - tail ? 1 - progress : Math.pow(1 - progress, 2) / tail;
        const radius = Math.max(0.05, maximumRadius * radiusShape);
        const normalX = -fold.creaseDirection.y;
        const normalY = fold.creaseDirection.x;
        const creaseDistance = calculatePointerAlignedCreaseDistance(fold.dragDistance, radius);
        const creaseOffset = creaseDistance - fold.dragDistance / 2;
        const creaseMidX = fold.creaseMid.x - normalX * creaseOffset;
        const creaseMidY = fold.creaseMid.y - normalY * creaseOffset;
        const horizontalSign = turnFromRight ? 1 : -1;
        const count = this.textureCoordinates.length / 2;

        for (let index = 0; index < count; index += 1) {
            const pageX = this.textureCoordinates[index * 2] * this.width;
            const pageY = this.textureCoordinates[index * 2 + 1] * this.height;
            const distance = (pageX - creaseMidX) * normalX + (pageY - creaseMidY) * normalY;
            let warpedX = pageX;
            let warpedY = pageY;
            let depth = 0;

            if (distance > 0) {
                const angle = distance / radius;
                const offset =
                    angle <= Math.PI
                        ? radius * Math.sin(angle) - distance
                        : Math.PI * radius - 2 * distance;
                warpedX += normalX * offset;
                warpedY += normalY * offset;
                depth = angle <= Math.PI ? radius * (1 - Math.cos(angle)) : 2 * radius;
            }

            this.positions[index * 3] = this.width + horizontalSign * warpedX;
            this.positions[index * 3 + 1] = this.paddingY + warpedY;
            this.positions[index * 3 + 2] = depth;
        }

        this.computeNormals(!turnFromRight);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.positions);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.normals);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(this.program);
        gl.bindVertexArray(this.vertexArray);
        gl.uniform2f(
            gl.getUniformLocation(this.program, 'uResolution'),
            this.width * 2,
            this.height + this.paddingY * 2,
        );
        gl.uniform1f(gl.getUniformLocation(this.program, 'uDepth'), Math.max(1, radius * 4));
        gl.uniform3f(
            gl.getUniformLocation(this.program, 'uLightDirection'),
            turnFromRight ? 0.3 : -0.3,
            -0.4,
            0.85,
        );
        gl.uniform1f(
            gl.getUniformLocation(this.program, 'uShadowStrength'),
            Math.max(0, Math.min(1, shadowStrength)),
        );
        gl.uniform1i(gl.getUniformLocation(this.program, 'uHasBack'), this.hasBackTexture ? 1 : 0);
        gl.uniform1i(gl.getUniformLocation(this.program, 'uMirrorUv'), turnFromRight ? 0 : 1);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.frontTexture);
        gl.uniform1i(gl.getUniformLocation(this.program, 'uFront'), 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.backTexture);
        gl.uniform1i(gl.getUniformLocation(this.program, 'uBack'), 1);
        gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);
        gl.bindVertexArray(null);
    }

    public dispose(): void {
        const gl = this.gl;
        gl.deleteTexture(this.frontTexture);
        gl.deleteTexture(this.backTexture);
        gl.deleteBuffer(this.positionBuffer);
        gl.deleteBuffer(this.normalBuffer);
        gl.deleteBuffer(this.uvBuffer);
        gl.deleteBuffer(this.indexBuffer);
        gl.deleteVertexArray(this.vertexArray);
        gl.deleteProgram(this.program);
    }
}
