// 1. إعدادات Firebase الخاصة بمشروعك (تم جلبها من صورتك)
const firebaseConfig = {
    apiKey: "AIzaSyD-G_jk_UgqxGUuedsRZuqgfQgrkGWG2MM",
    authDomain: "://firebaseapp.com",
    databaseURL: "https://sdfq-63ee0-default-rtdb.firebaseio.com",
    projectId: "sdfq-63ee0",
    storageBucket: "sdfq-63ee0.firebasestorage.app",
    messagingSenderId: "210107075463",
    appId: "1:210107075463:web:469133f4305ecd61d42122",
    measurementId: "G-0CNB95E2X4"
};

// تهيئة مكتبة Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ربط عناصر واجهة اللعبة (HTML) بالبرمجة
const lobby = document.getElementById('lobby');
const gameArea = document.getElementById('gameArea');
const joinBtn = document.getElementById('joinBtn');
const usernameInput = document.getElementById('username');
const roomInput = document.getElementById('roomCode');
const canvas = document.getElementById('paintCanvas');
const ctx = canvas.getContext('2d');
const clearBtn = document.getElementById('clearBtn');
const guessInput = document.getElementById('guessInput');
const sendGuessBtn = document.getElementById('sendGuessBtn');
const chatBox = document.getElementById('chatBox');

let myName = "";
let roomCode = "";
let isDrawing = false;
let currentColor = "#000000";

// ضبط أبعاد اللوحة تلقائياً لتناسب شاشات الجوال والآيباد والكمبيوتر
function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    ctx.lineCap = 'round';
    ctx.lineWidth = 4;
}
window.addEventListener('resize', resizeCanvas);

// حدث الضغط على زر الدخول للعبة
joinBtn.addEventListener('click', () => {
    myName = usernameInput.value.trim();
    roomCode = roomInput.value.trim();
    
    if(!myName || !roomCode) {
        alert("الرجاء كتابة اسمك واختيار رمز للغرفة أولاً!");
        return;
    }
    
    // إخفاء شاشة الدخول وإظهار لوحة اللعب والدردشة
    lobby.classList.add('hidden');
    gameArea.classList.remove('hidden');
    resizeCanvas();
    
    // بدء الاستماع للغرفة المشتركة في قاعدة البيانات
    listenToRoom();
});

// ميكانيكية حساب موقع الرسم بدقة كنسبة مئوية ليتطابق بين جميع الأجهزة المختلفة
function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
        x: (clientX - rect.left) / canvas.clientWidth,
        y: (clientY - rect.top) / canvas.clientHeight
    };
}

function startDrawing(e) {
    isDrawing = true;
    draw(e);
}

function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    ctx.beginPath();
    // إرسال إشارة توقف للرسم الحالي إلى السيرفر
    database.ref(`rooms/${roomCode}/drawing`).push({ action: 'stop' });
}

function draw(e) {
    if(!isDrawing) return;
    const pos = getPos(e);
    
    // رفع إحداثيات خط الرسم مباشرة إلى قاعدة بيانات Firebase
    database.ref(`rooms/${roomCode}/drawing`).push({
        x: pos.x,
        y: pos.y,
        color: currentColor,
        action: 'draw'
    });
}

// مستمعات الأحداث لدعم الماوس (الكمبيوتر) واللمس (الجوال والآيباد)
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
window.addEventListener('mouseup', stopDrawing);

canvas.addEventListener('touchstart', (e) => { e.preventDefault(); startDrawing(e); }, { passive: false });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); draw(e); }, { passive: false });
canvas.addEventListener('touchend', stopDrawing);

// دالة تغيير ألوان القلم
function changeColor(color) {
    currentColor = color;
}

// مسح اللوحة عند جميع اللاعبين في نفس اللحظة
clearBtn.addEventListener('click', () => {
    database.ref(`rooms/${roomCode}/drawing`).set(null);
});

// إرسال التخمينات أو الدردشة للغرفة
sendGuessBtn.addEventListener('click', sendGuess);
guessInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') sendGuess(); });

function sendGuess() {
    const text = guessInput.value.trim();
    if(!text) return;
    
    database.ref(`rooms/${roomCode}/chat`).push({
        sender: myName,
        message: text
    });
    guessInput.value = "";
}

// دالة المزامنة اللحظية الشاملة للرسم والمحادثات
function listenToRoom() {
    // 1. استقبال خطوط الرسم من اللاعب الآخر ورسمها فوراً على شاشتك
    database.ref(`rooms/${roomCode}/drawing`).on('value', (snapshot) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        
        const data = snapshot.val();
        if(!data) return;
        
        Object.values(data).forEach(point => {
            if(point.action === 'stop') {
                ctx.beginPath();
            } else if(point.action === 'draw') {
                ctx.strokeStyle = point.color;
                const actualX = point.x * canvas.width;
                const actualY = point.y * canvas.height;
                ctx.lineTo(actualX, actualY);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(actualX, actualY);
            }
        });
    });
    
    // 2. استقبال رسائل الدردشة والتخمينات الجديدة وعرضها في الصندوق
    database.ref(`rooms/${roomCode}/chat`).on('child_added', (snapshot) => {
        const data = snapshot.val();
        const msgElement = document.createElement('div');
        msgElement.style.marginBottom = "5px";
        msgElement.innerHTML = `<strong>${data.sender}:</strong> ${data.message}`;
        chatBox.appendChild(msgElement);
        chatBox.scrollTop = chatBox.scrollHeight;
    });
}
