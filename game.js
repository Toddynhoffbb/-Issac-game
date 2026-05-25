const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 500,
    backgroundColor: '#1a1a1a', // Cor das paredes/salas do Isaac
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 } }
    },
    scale: {
        mode: Phaser.Scale.FIT, // Ajusta automaticamente ao celular
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: { preload: preload, create: create, update: update }
};

const game = new Phaser.Game(config);

let player;
let tears;
let cursors, keys;
let joystickLeft, joystickRight;
let isMobile = false;

function preload() {
    // O Phaser tem um sistema de gerar texturas na memória!
    // Vamos desenhar o Isaac e as pedras usando código para não precisar de imagens agora.

    // 1. Desenhando o "Isaac"
    let isaacGfx = this.add.graphics();
    // Corpo (pele)
    isaacGfx.fillStyle(0xf5c6a0, 1);
    isaacGfx.fillRect(6, 14, 20, 16);
    // Cabeça (pele)
    isaacGfx.fillStyle(0xf5c6a0, 1);
    isaacGfx.fillCircle(16, 10, 10);
    // Cabelo (Loiro cacheado)
    isaacGfx.fillStyle(0xe6c75a, 1);
    isaacGfx.fillRect(6, 0, 20, 8);
    isaacGfx.fillRect(4, 4, 4, 8);
    isaacGfx.fillRect(28, 4, 4, 8);
    // Olhos (pretos)
    isaacGfx.fillStyle(0x000000, 1);
    isaacGfx.fillRect(11, 8, 3, 4);
    isaacGfx.fillRect(18, 8, 3, 4);
    // Lágrima olho
    isaacGfx.fillStyle(0x6bb5ff, 1);
    isaacGfx.fillRect(12, 12, 2, 2);
    
    isaacGfx.generateTexture('playerImg', 32, 32);
    isaacGfx.destroy();

    // 2. Desenhando a Lágrima (Tiro)
    let tearGfx = this.add.graphics();
    tearGfx.fillStyle(0x6bb5ff, 1); // Azul claro
    tearGfx.fillCircle(6, 6, 6);
    tearGfx.generateTexture('tearImg', 12, 12);
    tearGfx.destroy();

    // 3. Desenhando a Pedra (Obstáculo)
    let rockGfx = this.add.graphics();
    rockGfx.fillStyle(0x555555, 1);
    rockGfx.fillRect(0, 6, 32, 26);
    rockGfx.fillStyle(0x666666, 1);
    rockGfx.fillRect(2, 2, 28, 10);
    rockGfx.generateTexture('rockImg', 32, 32);
    rockGfx.destroy();

    // 4. Desenhando o Poço de Lava/Sangue (Decoração)
    let spikeGfx = this.add.graphics();
    spikeGfx.fillStyle(0x8b0000, 1);
    spikeGfx.fillRect(0, 0, 32, 32);
    spikeGfx.fillStyle(0xff0000, 1);
    spikeGfx.fillRect(4, 4, 24, 24);
    spikeGfx.generateTexture('spikeImg', 32, 32);
    spikeGfx.destroy();
}

function create() {
    // Detecta se é celular
    isMobile = this.sys.game.device.input.touch;

    // --- CENARIO ---
    // Borda da sala
    let walls = this.physics.add.staticGroup();
    // Chão mais claro no centro
    let floorGfx = this.add.graphics();
    floorGfx.fillStyle(0x2b2b2b, 1);
    floorGfx.fillRect(32, 32, 736, 436);

    // Cria as paredes
    for (let i = 0; i < 25; i++) {
        walls.create(16 + i * 32, 16, 'rockImg').setAlpha(0.5); // Cima
        walls.create(16 + i * 32, 484, 'rockImg').setAlpha(0.5); // Baixo
    }
    for (let i = 1; i < 14; i++) {
        walls.create(16, 16 + i * 32, 'rockImg').setAlpha(0.5); // Esq
        walls.create(784, 16 + i * 32, 'rockImg').setAlpha(0.5); // Dir
    }

    // Obstáculos dentro da sala
    let rocks = this.physics.add.staticGroup();
    rocks.create(200, 200, 'rockImg');
    rocks.create(600, 300, 'rockImg');
    rocks.create(400, 150, 'spikeImg'); // Perigo!

    // --- PLAYER ---
    player = this.physics.add.sprite(400, 250, 'playerImg');
    player.setCollideWorldBounds(true);
    player.setSize(20, 20); // Hitbox um pouco menor que o visual

    // --- TIROS (LÁGRIMAS) ---
    tears = this.physics.add.group();

    // --- COLISÕES ---
    this.physics.add.collider(player, walls);
    this.physics.add.collider(player, rocks, hitObstacle, null, this);
    this.physics.add.collider(tears, walls, destroyTear, null, this);
    this.physics.add.collider(tears, rocks, destroyTear, null, this);

    // --- CONTROLES DE PC ---
    cursors = this.input.keyboard.createCursorKeys();
    keys = this.input.keyboard.addKeys('W,A,S,D');

    // --- JOYSTICKS (CELULAR) ---
    if (isMobile) {
        // Joystick Esquerdo (Andar)
        joystickLeft = this.plugins.get('rexvirtualjoystickplugin').add(this, {
            x: 120, y: 400,
            radius: 50,
            base: this.add.circle(0, 0, 60, 0x444444).setAlpha(0.5),
            thumb: this.add.circle(0, 0, 30, 0x888888).setAlpha(0.7),
            dir: '8dir', forceMin: 10
        });

        // Joystick Direito (Atirar)
        joystickRight = this.plugins.get('rexvirtualjoystickplugin').add(this, {
            x: 680, y: 400,
            radius: 50,
            base: this.add.circle(0, 0, 60, 0x444444).setAlpha(0.5),
            thumb: this.add.circle(0, 0, 30, 0x6bb5ff).setAlpha(0.7), // Cor da lágrima
            dir: '8dir', forceMin: 10
        });
    }
}

// Função quando o jogador bate numa pedra ou espinho
function hitObstacle(player, obstacle) {
    if (obstacle.texture.key === 'spikeImg') {
        player.setTint(0xff0000); // Fica vermelho
        this.time.delayedCall(200, () => { player.clearTint(); });
    }
}

// Função para destruir a lágrima ao bater na parede/pedra
function destroyTear(tear) {
    tear.destroy();
}

let lastShotTime = 0;

function update() {
    const speed = 200;
    const shootSpeed = 300;
    const shootCooldown = 280; // Tiros por segundo

    let vx = 0, vy = 0; // Velocidade do jogador
    let shootVx = 0, shootVy = 0; // Direção do tiro

    // --- LÓGICA DE CONTROLE ---
    if (isMobile) {
        // Se for celular, lê os joysticks
        let leftForce = joystickLeft.force;
        let leftAngle = joystickLeft.angle;
        if (leftForce > 0) {
            vx = Math.cos(leftAngle * Math.PI / 180) * speed;
            vy = Math.sin(leftAngle * Math.PI / 180) * speed;
        }

        let rightForce = joystickRight.force;
        let rightAngle = joystickRight.angle;
        if (rightForce > 0) {
            shootVx = Math.cos(rightAngle * Math.PI / 180) * shootSpeed;
            shootVy = Math.sin(rightAngle * Math.PI / 180) * shootSpeed;
        }
    } else {
        // Se for PC, lê o teclado
        player.setVelocity(0);
        if (cursors.left.isDown || keys.A.isDown) vx = -speed;
        else if (cursors.right.isDown || keys.D.isDown) vx = speed;
        if (cursors.up.isDown || keys.W.isDown) vy = -speed;
        else if (cursors.down.isDown || keys.S.isDown) vy = speed;

        // Tiros PC (Setas)
        if (cursors.left.isDown) shootVx = -shootSpeed;
        else if (cursors.right.isDown) shootVx = shootSpeed;
        if (cursors.up.isDown) shootVy = -shootSpeed;
        else if (cursors.down.isDown) shootVy = shootSpeed;
    }

    // Aplica o movimento
    player.setVelocity(vx, vy);

    // --- LÓGICA DE TIRO ---
    let currentTime = this.time.now;
    if ((shootVx !== 0 || shootVy !== 0) && currentTime - lastShotTime > shootCooldown) {
        lastShotTime = currentTime;
        
        // Cria a lágrima
        let tear = tears.create(player.x, player.y + 5, 'tearImg');
        tear.setVelocity(shootVx, shootVy);
        tear.setSize(8, 8); // Hitbox menor
        
        // Destrói a lágrima depois de um tempo (simula o "cair no chão" do Isaac)
        this.time.delayedCall(800, () => {
            if (tear && tear.active) tear.destroy();
        });
    }
}
