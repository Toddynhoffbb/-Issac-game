const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 500,
    backgroundColor: '#1a1a1a',
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 } }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: { create: create, update: update }
};

const game = new Phaser.Game(config);

let player;
let tears;
let cursors, keys;
let isMobile = false;

// Variáveis dos Joysticks
let joyStickLeft, joyStickRight;
let joyLeftKeys, joyRightKeys;

// Variáveis visuais dos Joysticks
let baseLeft, thumbLeft, baseRight, thumbRight;

function create() {
    isMobile = this.sys.game.device.input.touch;

    // --- GERANDO AS IMAGENS DIRETO NO CÓDIGO (Sem precisar baixar nada) ---
    let gfx;

    // Player (Corpo pele + Olho preto + Lágrima azul no olho)
    gfx = this.add.graphics();
    gfx.fillStyle(0xf5c6a0, 1); gfx.fillRect(0, 0, 32, 32); // Corpo
    gfx.fillStyle(0x000000, 1); gfx.fillRect(12, 10, 8, 10); // Olho
    gfx.fillStyle(0x6bb5ff, 1); gfx.fillRect(14, 16, 4, 4);  // Lágrima
    gfx.generateTexture('playerImg', 32, 32);
    gfx.destroy();

    // Lágrima (Tiro)
    gfx = this.add.graphics();
    gfx.fillStyle(0x6bb5ff, 1); gfx.fillCircle(6, 6, 6);
    gfx.generateTexture('tearImg', 12, 12);
    gfx.destroy();

    // Pedra
    gfx = this.add.graphics();
    gfx.fillStyle(0x555555, 1); gfx.fillRect(0, 0, 32, 32);
    gfx.generateTexture('rockImg', 32, 32);
    gfx.destroy();

    // --- CENÁRIO ---
    let walls = this.physics.add.staticGroup();
    let rocks = this.physics.add.staticGroup();

    // Chão
    let floor = this.add.graphics();
    floor.fillStyle(0x2b2b2b, 1);
    floor.fillRect(32, 32, 736, 436);

    // Paredes
    for (let i = 0; i < 25; i++) {
        walls.create(16 + i * 32, 16, 'rockImg').setAlpha(0.5).refreshBody();
        walls.create(16 + i * 32, 484, 'rockImg').setAlpha(0.5).refreshBody();
    }
    for (let i = 1; i < 14; i++) {
        walls.create(16, 16 + i * 32, 'rockImg').setAlpha(0.5).refreshBody();
        walls.create(784, 16 + i * 32, 'rockImg').setAlpha(0.5).refreshBody();
    }

    // Pedras do meio da sala
    rocks.create(200, 200, 'rockImg').refreshBody();
    rocks.create(600, 300, 'rockImg').refreshBody();

    // --- PLAYER ---
    player = this.physics.add.sprite(400, 250, 'playerImg');
    player.setCollideWorldBounds(true);
    player.setSize(20, 20);

    // --- TIROS ---
    tears = this.physics.add.group();

    // --- COLISÕES ---
    this.physics.add.collider(player, walls);
    this.physics.add.collider(player, rocks);
    this.physics.add.collider(tears, walls, (tear) => tear.destroy());
    this.physics.add.collider(tears, rocks, (tear) => tear.destroy());

    // --- CONTROLES PC ---
    cursors = this.input.keyboard.createCursorKeys();
    keys = this.input.keyboard.addKeys('W,A,S,D');

    // --- CONTROLES CELULAR (JOYSTICKS NATIVOS) ---
    if (isMobile) {
        // Desenhando o visual dos joysticks (Círculos)
        baseLeft = this.add.circle(120, 400, 60, 0x444444, 0.5).setDepth(100);
        thumbLeft = this.add.circle(120, 400, 25, 0x888888, 0.8).setDepth(101);
        
        baseRight = this.add.circle(680, 400, 60, 0x444444, 0.5).setDepth(100);
        thumbRight = this.add.circle(680, 400, 25, 0x6bb5ff, 0.8).setDepth(101);

        // Configurando o toque na tela (Esquerda = Andar, Direita = Atirar)
        this.input.on('pointermove', (pointer) => {
            if (!pointer.isDown) return;
            
            // Se o toque foi na metade esquerda da tela
            if (pointer.x < this.cameras.main.width / 2) {
                baseLeft.setPosition(pointer.x, pointer.y);
                thumbLeft.setPosition(pointer.x + pointer.deltaX, pointer.y + pointer.deltaY);
