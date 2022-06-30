var score = parseInt(localStorage.getItem("PausedScore") ), time = parseInt(localStorage.getItem("time")) != NaN ? parseInt(localStorage.getItem("time")) : 30;
function changeValue(){
    var ObjectSelector = document.getElementById('myList');
    var value1 = ObjectSelector.options[ObjectSelector.selectedIndex].text;
    localStorage.setItem("value" , value1);
}

function changeDifficulty(){
    var ObjectSelector = document.getElementById('difficultyList');
    var difficultyValue = ObjectSelector.options[ObjectSelector.selectedIndex].text;
    localStorage.setItem("difficulty" , difficultyValue);
}

/* Shims, Polyfills, and Utils */
window.requestAnimFrame = (function () {
    return window.requestAnimationFrame || 
    window.webkitRequestAnimationFrame || 
    window.mozRequestAnimationFrame || 
    window.oRequestAnimationFrame || 
    window.msRequestAnimationFrame || 
    function (callback) {
        window.setTimeout(callback, 1000 / 60);
    };
})();
if (typeof Object.create !== 'function') {
    Object.create = function (o) {
        function F() {}
        F.prototype = o;
        return new F();
    };
}
if (typeof Object.extend !== 'function') {
    Object.extend = function (d, s) {
        for (var k in s) {
            if (s.hasOwnProperty(k)) {
                var v = s[k];
                if (d.hasOwnProperty(k) && typeof d[k] === "object" && typeof v === "object") {
                    Object.extend(d[k], v);
                } else {
                    d[k] = v;
                }
            }
        }
        return d;
    };
}
/* Scene Object */
function Scene() {
    this.animation = undefined;
    this.canvas = undefined;
    this.height = 0;
    this.width = 0;
    this.context = undefined;
    this.paused = false;
    this.stats = undefined;
    this.istats = undefined;
}
Scene.prototype = {
    constructor: Scene,
    setup: function (canvas, animation, width, height, stats) {
        this.canvas = canvas;
        this.animation = animation;
        this.height = this.canvas.height = height;
        this.width = this.canvas.width = width;
        this.context = this.canvas.getContext('2d');
        this.stats = stats && window.Stats;
        if (this.stats) {
            this.istats = new Stats();
            this.istats.setMode(0);
            this.istats.domElement.style.position = 'absolute';
            this.istats.domElement.style.left = '0px';
            this.istats.domElement.style.top = '0px';
            this.istats.domElement.style.zIndex = '99999';
            document.body.appendChild(this.istats.domElement);
        }
    },
    animate: function () {
        if (!this.paused) {
            requestAnimFrame(this.animate.bind(this));
        }
        this.stats && (this.istats.begin());
        this.animation(this);
        this.stats && (this.istats.end());
    }
};
/* Particle Object */
function Particle() {
    this.x = 0;
    this.y = 0;
    this.size = 0;
    this.color = '#fff';
    this.vx = 0;
    this.vy = 0;
    this.destroy = false;
    this.collision_partner = null;
    this.gravity = 0;
    this.wind = 0;
}
Particle.prototype = {
    constructor: Particle,
    update: function () {
        this.vy += this.gravity;
        this.vx += this.wind;
        this.x += this.vx;
        this.y += this.vy;
        this.onafterupdate && this.onafterupdate.call(this);
    },
    draw: function (ctx) {
        if (this.img) {
            ctx.drawImage(this.img, this.x, this.y, this.size, this.size);
        } else {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2, false);
            ctx.fill();
        }
    }
};
/* Emitter */
function Emitter() {
    this.particles = [];
}
Emitter.prototype = {
    constructor: Emitter,
    create: function (properties) {
        var particle = new Particle();
        Object.extend(particle, properties);
        this.particles.push(particle);
    },
    update: function (ctx, width, height) {
        var self = this;
        this.particles = this.particles.filter(function (particle) {
            return !particle.destroy;
        });
        this.particles.forEach(function (particle, i) {
            particle.draw(ctx);
            particle.update();
            var collision_partner = self.check(particle);
            if (!self.in_view(particle, width, height)) {
                particle.onviewexit && particle.onviewexit.call(particle);
            }
            if (collision_partner) {
                particle.oncollision && particle.oncollision.call(particle, collision_partner);
            }
        });
    },
    in_view: function (particle, width, height) {
        var hs = particle.size / 2;
        return particle.x - hs < width && particle.x + hs > 0 && particle.y + hs > 0 && particle.y - hs < height;
    },
    check: function (particle) {
        var x2 = particle.x,
            y2 = particle.y,
            rad2 = particle.size,
            ret;
        this.particles.forEach(function (_particle) {
            if (_particle !== particle) {
                var x1 = _particle.x,
                    y1 = _particle.y,
                    rad1 = _particle.size;
                var d = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
                if (d < rad1 - rad2) {
                    ret = _particle;
                }
            }
        });
        return ret;
    }
};

var value = localStorage.getItem("value");
var difficultyValue = localStorage.getItem("difficulty");
var canvas = document.getElementById('canvas'),
    len = document.getElementById('len'),
    height = canvas.height = document.body.offsetHeight,
    width = canvas.width = document.body.offsetWidth,
    scene = new Scene(),
    emitter = new Emitter(),
    firespeed, angle, maxspeed = 13,
    gx = width * 0.05,
    gy = height - height * 0.05,
    shots_per_second = 5,
    shot_count = 0,
    heat = 0,
    heatcolors = ["#fff", "#ff0", "#f00"],
    broken_heart = new Array();
    broken_heart[0] = new Image(), 
    broken_heart[1] = new Image(), 
    i_bubble = new Image(),
    i_bubble_power = new Image(),
    // i_bubble_toxic = new Image(),
    i_bubble_gold = new Image(),
    i_bullet = new Image(),
    types = [{
        name: 'Bubble',
        hits: 100,
        color: '#3d6aa3',
        img: i_bubble, // blue
        minvalue: 10,
        maxvalue: 40,
        rarity: 1,
        time: 1.25
    }, {
        name: 'Power Bubble',
        hits: 110,
        color: '#3d68ff',
        img: i_bubble_power,  // red
        minvalue: 20,
        maxvalue: 70,
        rarity: .35,
        time: 2.5
    }, {
        name: 'Bad Bubble',
        hits: 1,
        color: '#f00',
        img: broken_heart[0], // broken red
        minvalue: -10,
        maxvalue: -20,
        rarity: 0.5,
        time: -1
    }, {
        name: 'Golden Bubble',
        hits: 200,
        color: '#ff0',
        img: i_bubble_gold,  // good yellow
        minvalue: 50,
        maxvalue: 200,
        rarity: 0.1,
        time: 10
    }

    ]

    scoreboard = document.getElementById('score'),
    timer = document.getElementById('timer');
    if(value == "Hearts"){
        i_bubble.src = './Hearts/heartblue.svg';
        i_bubble_power.src = './Hearts/heartred.svg';
        broken_heart[0].src = './Hearts/heartredbroken.svg'; 
        broken_heart[1].src = 'Hearts\heartyellowbroken.svg'; 
        i_bubble_gold.src = './Hearts/heartgolden.svg';
    }
    else if(value == "Bubbles"){
        i_bubble.src = 'https://i.imgur.com/hVSo95T.png';
        i_bubble_power.src = 'https://i.imgur.com/CzqIcTI.png';
        broken_heart[0].src = 'https://i.imgur.com/v317naC.png'; 
        broken_heart[1].src = './Bubbles/heartyellowbroken.svg'; 
        i_bubble_gold.src = 'https://i.imgur.com/NhnHk0h.png';
    }
    else if(value == "Birds"){
        i_bubble.src = './Birds/bluebird.svg';
        i_bubble_power.src = './Birds/redbird.svg';
        broken_heart[0].src = './Birds/purplebird.svg'; 
        broken_heart[1].src = './Birds/heartyellowbroken.svg'; 
        i_bubble_gold.src = './Birds/yellowbird.svg';
    }

function run(scene) {
    var ctx = scene.context;
    ctx.clearRect(0, 0, scene.width, scene.height);
    emitter.update(ctx, scene.width, scene.height);
    var a = angle,
        endX = gx + (firespeed * 0.00001) * Math.cos(a * Math.PI / 180),
        endY = gy + (firespeed * 0.00001) * Math.sin(a * Math.PI / 180);
    ctx.strokeStyle = heatcolors[heat];
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    scoreboard.textContent = score | 0;
}
scene.setup(canvas, run, width, height, !1);
scene.animate();
window.onresize = function () {
    height = canvas.height = scene.height = document.body.offsetHeight;
    width = canvas.width = scene.width = document.body.offsetWidth;
    gx = width * 0.05;
    gy = height - height * 0.05;
};


var gwind = 0;
(function windEmitter() {
    gwind = (difficultyValue == "Easy" ? 
    (Math.random() - 0.5) / 50 : 
    difficultyValue == "Medium" ? 
    (Math.random() - 0.5) / 8 : 
    (Math.random() - 0.5) / 4 );
    setTimeout(windEmitter, 200); // was 1000
}());

setInterval(function () {
    var r = Math.random();
    var type = types.filter(function (t) {
        return t.rarity > r;
    }).sort(function (a, b) {
        return a.rarity - b.rarity;
    })[0];
    emitter.create({
        y: height + 20,
        x: Math.random() * (width * 0.7) + (width * 0.3),
        size: Math.random() * 10 + 45,
        vx: 0,
        vy: -0.05,
        name: type.name,
        hp: type.hits,
        time: type.time,
        img: type.img,
        gravity: (difficultyValue == "Easy" ? 
        -0.001 : difficultyValue == "Medium" ? 
        -0.002 : -0.004), // was -0.001
        value: type.minvalue + (Math.random() * (type.maxvalue - type.minvalue)),
        wind: gwind,
        color: type.color,
        onviewexit: function () {
            this.destroy = true;
        },
        oncollision: function (collision_partner) {
            var obj = collision_partner,
                angleA = Math.atan2(this.y - obj.y, this.x - obj.x),
                angleB = Math.atan2(obj.y - this.y, obj.x - this.x);
            this.vx = Math.cos(angleA);
            this.vy = Math.sin(angleA);
            obj.vx = Math.cos(angleB) / 2;
            obj.vy = Math.sin(angleB) / 2;
        },
        onafterupdate: function () {
            this.wind = gwind;
        }
    });
}, difficultyValue == "Hard" ? Math.random() * 900 + 1 : Math.random() * 950 + 1 );



canvas.onmousemove = function (event) {
    var deltaY = event.clientY - gy;
    var deltaX = event.clientX - gx;
    var deg = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
    angle = deg + 360;
    var xs = deltaX * deltaX,
        ys = deltaY * deltaY,
        distance = Math.sqrt(xs + ys) / 10;
    if (distance > maxspeed) {
        distance = maxspeed;
    }
    firespeed = distance;
};

canvas.onclick = function (event) {
    if (shot_count < shots_per_second) {
        if (shot_count === 0) {
            setTimeout(function () {
                heat = 0;
                shot_count = 0;
            }, 1000);
        }
        heat = ++shot_count;
        emitter.create({
            x: event.clientX,
            y: event.clientY,
            vx: 0,
            vy: 0,
            color: '',
            size: 0,
            gravity: 0.001,
            onviewexit: function () {
                this.destroy = true;
            },
            oncollision: function (collision_partner) {
                var crit = Math.random() > .7 ? 50 : 0;
                collision_partner.hp -= 50 + crit;
                console.log(JSON.stringify(collision_partner));
                if (collision_partner.hp > 0) {
                    collision_partner.oncollision.call(collision_partner, this);
                } else {
                    collision_partner.destroy = true;
                    if(event.clientX != null && event.clientY != null){
                        if(collision_partner.name == "Bubble"){
                            score += 10;
                        }
                        else if(collision_partner.name == "Power Bubble"){
                            time += 1.25;
                            score += 10;
                        }
                        else if(collision_partner.name == "Bad Bubble"){
                            time -= 1.25;
                        }
                        else if(collision_partner.name == "Golden Bubble"){
                            time += 2;
                            score += 20;
                        }
                    }
                    for (var i = 0; i < 20; i++) {
                        emitter.create({
                            y: collision_partner.y,
                            x: collision_partner.x,
                            size: Math.random() * 5 + 1,
                            vx: Math.random() * 10 - 5,
                            vy: Math.random() * 10 - 5,
                            onviewexit: function () {
                                this.destroy = true;
                            },
                            gravity: .09,
                            color: collision_partner.color,
                            img: collision_partner.img
                        });
                    }
                }
                this.destroy = true;
            }
        });
    }
}

function endgame() {
    alert('game over score: ' + (score | 0));
    scene.paused = true;
    localStorage.setItem("PausedScore" , 0);
    localStorage.setItem("time" , 30);
}

function Restartgame(){
    localStorage.setItem("PausedScore" , 0);
    localStorage.setItem("time" , 30);
    document.location.reload();
}

const PauseButton = document.getElementById('pause');
const ResumeButton = document.getElementById('resume');
ResumeButton.disabled = true;

function PauseGame(){
    scene.paused = true;
    localStorage.setItem("PausedScore" , score);
    localStorage.setItem("time" , time + 2);
    PauseButton.disabled = true; 
    ResumeButton.disabled = false;
}

function ResumeGame(){
    document.location.reload();
    score = localStorage.getItem("PausedScore");
    time = localStorage.getItem("time");
    ResumeButton.disabled = true;
    PauseButton.disabled = false;
}

ResumeButton.addEventListener("click" , ResumeGame);
PauseButton.addEventListener("click" , PauseGame);

function level() {
    if (scene.paused == false) {
        timer.textContent = time < 0 ? 0 : time;
        time--;
        if(time <= 9){
            timer.style.color = 'red'; 
            timer.style.fontSize = '30px';
        }
        if(time > 9){
            timer.style.color = 'lightgreen'; 
            timer.style.fontSize = '16px';
        }
        if (time === 0 || time < 0) {
            endgame();
        }
        setTimeout(level, 1000);
    }
}
level();
const RestartButton = document.getElementById("restart");
RestartButton.addEventListener("click" , Restartgame)

