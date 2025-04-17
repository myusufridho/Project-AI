const chatbotId = document.currentScript.getAttribute('chatbotId');
const chatInput = document.querySelector('.chat-input textarea');
var sendChatBtn = document.querySelector('.send-btn');
var speakaudio = true
var chatbot_color
const chatbox = document.querySelector('.chatbox');
const inputInitHeight = chatInput.scrollHeight;
const chatinputall = document.querySelector('.chat-input');
const hidden = document.querySelector('.hidden');
const chatbotElement = document.querySelector('.chatbot');
const chatbotName = chatbotElement.getAttribute('data-chatbot-name');


let greetings = [];


async function getGreetingMessages() {
    try {
        const response = await fetch(`/chatbot/greetings/${chatbotId}`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const data = await response.json();
        if (typeof data.greetingMessages === 'string') {
            greetings = JSON.parse(data.greetingMessages);
        } else {
            greetings = data.greetingMessages || [];
        }
        console.log("Greeting messages:", greetings);

    } catch (error) {
        console.error("Error fetching greeting messages:", error);
        // Minimal set jadi empty array. Fallback greeting boleh, tapi singkat
        greetings = [];
    }
}


  


  const initMessage = () => {
    const randomIndex = Math.floor(Math.random() * greetings.length);
    localStorage.setItem('completions', JSON.stringify([{
      role: 'assistant',
      content: greetings[randomIndex]
    }]));
  }
let toggleButtonRight
let historyChat = localStorage.getItem('completions');


let userMessage;
let record = false;
let stopwatchInterval;
let total_voice_usage;
var current_answer
var voice_record = false
// TAMBAHKAN DI BAWAH variabel "voice_record = false"
// Tambahkan sistem tracking pesanan
let orderState = {
    items: [],
    stage: "INITIAL", // INITIAL -> PRODUCTS_CONFIRMED -> CUSTOMER_DATA_REQUESTED -> FINAL_CONFIRMATION
    confirmed: false,
    customerData: null
  };
  // Perbaikan parseOrderRequest untuk mendeteksi produk spesifik
function parseOrderRequest(message) {
    // Pola umum untuk mendeteksi pemesanan
    const orderMatch = message.match(/(?:mau|beli|pesan|iya|ya|saya mau)\s+([a-zA-Z\s]+)\s*(\d+)?/i);
  
    // Jika user hanya menjawab "iya" atau "ya" tanpa menyebutkan produk,
    // kita perlu melihat produk yang disebutkan sebelumnya dalam percakapan
    if (/^(iya|ya|ok|oke|mau)$/i.test(message.trim())) {
      // Mencari produk yang disebutkan terakhir dalam riwayat chat
      const lastProductMention = findLastProductInHistory();
      if (lastProductMention) {
        return {
          item: lastProductMention.product,
          quantity: 1,
          price: lastProductMention.price
        };
      }
    }
  
    if (orderMatch) {
      return {
        item: orderMatch[1].trim(),
        quantity: orderMatch[2] ? parseInt(orderMatch[2]) : 1
      };
    }
  
    // Deteksi produk spesifik yang disebutkan
    const productMention = detectSpecificProduct(message);
    if (productMention) {
      return {
        item: productMention.product,
        quantity: 1,
        price: productMention.price
      };
    }
  
    return null;
  }
  
  // Fungsi untuk mendeteksi produk spesifik
  function detectSpecificProduct(message) {
    const products = [
      { name: "Jaguar Man", price: 950000 },
      { name: "Nautica Voyage Man", price: 850000 },
      { name: "Bvlgari Aqva Man", price: 1145000 },
      { name: "Rhenza Extreme", price: 185000 },
      { name: "Rhenza Cool Man", price: 185000 }
      // Tambahkan produk lainnya
    ];
  
    for (const product of products) {
      // Buat regex yang lebih fleksibel untuk mencocokkan nama produk
      const regex = new RegExp(product.name.replace(/\s+/g, '\\s+'), 'i');
      if (regex.test(message)) {
        return {
          product: product.name,
          price: product.price
        };
      }
    }
  
    return null;
  }
  
  // Fungsi untuk mencari produk terakhir yang disebutkan dalam riwayat chat
  function findLastProductInHistory() {
    // Ambil riwayat chat dari localStorage
    const history = JSON.parse(localStorage.getItem('completions')) || [];
  
    // Produk yang diketahui
    const knownProducts = [
      { name: "Jaguar Man", price: 950000 },
      { name: "Nautica Voyage Man", price: 850000 },
      { name: "Bvlgari Aqva Man", price: 1145000 },
      { name: "Rhenza Extreme", price: 185000 },
      { name: "Rhenza Cool Man", price: 185000 }
      // Tambahkan produk lainnya
    ];
  
    // Periksa dari pesan terakhir ke awal
    for (let i = history.length - 1; i >= 0; i--) {
      const message = history[i].content;
  
      // Cek apakah pesan mengandung nama produk
      for (const product of knownProducts) {
        if (message.includes(product.name)) {
          return {
            product: product.name,
            price: product.price
          };
        }
      }
    }
  
    return null;
  }
  
  // Fungsi pemformat harga yang benar
  function formatPrice(price) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0

    }).format(price).replace('IDR', 'Rp');
  }
  
  // Validasi data pelanggan
  function validateCustomerData(data) {
    if (!data) return false;
  
    const { name, address, phone } = data;
  
    // Validasi nama
    if (!name || name.length < 2) return false;
  
    // Validasi alamat
    if (!address || address.length < 5) return false;
  
    // Validasi nomor telepon (minimal 10 digit untuk Indonesia)
    if (!phone || phone.length < 10 || !/^\d+$/.test(phone)) return false;
  
    return true;
  }
  
  // Modifikasi parseCustomerData
  function parseCustomerData(message) {
    // Format umum: nama: X, alamat: Y, no.hp: Z
    const dataMatch = message.match(/nama\s*:\s*([^,]+),\s*alamat\s*:\s*([^,]+),\s*no\.hp\s*:\s*(\d+)/i);
  
    if (dataMatch) {
      const data = {
        name: dataMatch[1].trim(),
        address: dataMatch[2].trim(),
        phone: dataMatch[3].trim()
      };
  
      // Validasi data
      if (validateCustomerData(data)) {
        return data;
      }
    }
  
    // Format alternatif: tanpa koma atau tanda baca lain
    const altMatch = message.match(/nama\s+([^\s]+)\s+alamat\s+([^\s]+)\s+(?:no\.hp|hp|telepon|telpon|nomor)\s+(\d+)/i);
  
    if (altMatch) {
      const data = {
        name: altMatch[1].trim(),
        address: altMatch[2].trim(),
        phone: altMatch[3].trim()
      };
  
      // Validasi data
      if (validateCustomerData(data)) {
        return data;
      }
    }
  
    return null;
  }
  
  
  // Fungsi mendeteksi konfirmasi
  function isOrderConfirmation(message) {
    // Tambahkan lebih banyak variasi konfirmasi
    return /sudah|benar|ya|iya|ok|oke|okay|betul|setuju|lanjut/i.test(message);
  }
  
  // Tambahkan fungsi untuk deteksi penolakan
function isOrderRejection(message) {
    return /tidak|belum|salah|ganti|ubah|batal|cancel/i.test(message);
  }
  
  // Fungsi ekstrak data pelanggan
  function parseCustomerData(message) {
    const dataMatch = message.match(/nama\s*:\s*([^,]+),\s*alamat\s*:\s*([^,]+),\s*no\.hp\s*:\s*(\d+)/i);
    if (dataMatch) {
      return {
        name: dataMatch[1].trim(),
        address: dataMatch[2].trim(),
        phone: dataMatch[3].trim()
      };
    }
    return null;
  }
  
function tokenlog(total_input_token, total_output_token,total_voice_usage) {
    const API_URL = `${window.location.origin}/chat/tokenlog/${encodeURIComponent(chatbotId)}`;
    const requestOptions = {
        method: 'post',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            input_token: total_input_token,
            output_token: total_output_token,
            voice_usage: total_voice_usage
        }),
    };

    fetch(API_URL, requestOptions)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
        })
        .catch(error => {
            console.error('Error logging token:', error);
        });
    
}

async function postUserMessage(chat) {
    try {
        const response = await fetch('https://servicechat.wibidigital.com/send_message', {
            //const response = await fetch('/api/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    human_input: chat // Mengirimkan input pengguna ke server backend
                }),
            });
            
            if (!response.ok) {
                console.error('Error:', response.statusText);
                return;
            }
            
            const data = await response.json(); // Ambil data dari response backend
            
            const textResponse = data.text; // Teks yang dirangkum
            const audioUrl = data.audio_url; // URL untuk audio yang dihasilkan
            
            // Menampilkan teks di chatbot
            const incomingChatLi = createChatLi(textResponse, 'incoming');
            chatbox.scrollTo(0, chatbox.scrollHeight);
            chatbox.appendChild(incomingChatLi);
            
            // Jika ada URL audio, mainkan audio di chatbot
            if (audioUrl) {
                // Menggunakan URL proxy yang telah dibuat di backend

                const audio = new Audio(`/audio-proxy${audioUrl}`); // Hanya path audio yang dikirim ke /audio-proxy

                audio.play(); // Memutar audio yang dihasilkan
            }
            
    } catch (error) {
        console.error('Error posting user message:', error);
    }
}



async function getChatbotColor() {
    try {
    const response = await fetch(`/chatbot/custom/color/${encodeURIComponent(chatbotId)}`, {
        method: 'GET',
        headers: {
        'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
        return data.color; 
    
    } catch (error) {
    console.error('Error fetching chatbot color:', error);
        return null; 
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    const sendChatBtn = document.getElementById('send-btn');
    const refreshChatBtn = document.querySelector('.chatbot header span');
    const voiceIcon = document.getElementById('voice-icon');

    // Ambil warna chatbot
    getChatbotColor()
        .then(color => {
            chatbot_color = color;
            const header = document.querySelector(".chatbot header");
            sendChatBtn.style.color = color.SendButtonColor;
            header.style.background = color.headerColor;
            voiceIcon.style.background = color.VoiceIconColor;
        })
        .catch(error => {
            console.error('Error:', error);
        });

    // Ambil pesan welcome dari database dan tampilkan di chatbox
    await getGreetingMessages();
    

    function updateUIOnRecordingStart() {
        const sendBtn = document.getElementById('send-btn');
        const voiceIcon = document.getElementById('voice-icon');
        const messageInput = document.getElementById('message-input');
        
        if (sendBtn && voiceIcon && messageInput ) {
            sendBtn.style.display = 'none';
            voiceIcon.textContent = 'stop';
            voiceIcon.classList.add('animate');
            voiceIcon.classList.add('recording');
            messageInput.style.display = 'none';
        }
    }
       
    function startStopwatch() {
        const displaywave = document.querySelector('.displaywave');
        if (displaywave){
            displaywave.style.display = "";
            displaywave.classList.add('fade-in');
        }

        const chatbox = document.querySelector('.chatbox');
        chatbox.style.height = "68%";
        chatbox.style.padding = "30px 15px 28px"
        chatbox.scrollTo(0, chatbox.scrollHeight);
    
        const chatinputall = document.querySelector('.chat-input');
        chatinputall.style.justifyContent = "center";
    
        const icon = document.getElementById('voice-icon');
        icon.style.display = "none";
        icon.classList.add('active-background');
    
        const messageInput = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');
    
        if (messageInput && sendBtn) {
            messageInput.style.display = 'none';
            sendBtn.style.display = 'none';
        }
    
        icon.textContent = 'mic';  
        icon.style.color = '#FFFFFF';  
        icon.style.backgroundColor = '#FF4E4E';  
        icon.style.borderRadius = '50%'; 
        icon.style.padding = '10px';  
        chatinputall.style.height = '24%';
        chatinputall.style.background = "#F9F9F9";
        
        if (!document.querySelector('.wave-container')) {
            const displaywave = document.createElement('div');
            displaywave.className = 'displaywave fade-in'; 
            displaywave.style.justifyContent = "center";
            const waveContainer = document.createElement('div');
            waveContainer.className = 'wave-container';
            
            const wave = document.createElement('div');
            wave.className = 'wave';
            
            for (let i = 0; i < 5; i++) { 
                const dot = document.createElement('div');
                dot.className = 'dot';
                wave.appendChild(dot);
            }
            waveContainer.appendChild(wave);
            displaywave.appendChild(waveContainer);
            chatinputall.appendChild(displaywave);
            const speakText = document.createElement('div');
            speakText.className = 'speak-text';
            speakText.textContent = 'Click the red button to start talking';
            displaywave.appendChild(speakText);
        }
        
        if (!document.getElementById('toggleWaveform')) {
            const toggleButtonLeft = document.createElement('button');
            toggleButtonLeft.className = 'material-symbols-outlined fade-in'; 
            toggleButtonLeft.id = 'toggleWaveform';
            toggleButtonLeft.textContent = 'keyboard';
            toggleButtonLeft.style.position = 'absolute';
            toggleButtonLeft.style.bottom = '10px';
            toggleButtonLeft.style.left = '10px';
            toggleButtonLeft.style.backgroundColor = 'linear-gradient(to right, #02218f, #0e72e3)';
            toggleButtonLeft.style.color = 'white';
            toggleButtonLeft.style.border = 'none';
            toggleButtonLeft.style.borderRadius = '5px';
            toggleButtonLeft.style.padding = '10px 15px';
            toggleButtonLeft.style.cursor = 'pointer';
            toggleButtonLeft.style.fontSize = '16px';
            toggleButtonLeft.addEventListener('click', () => {
                backtotyping();
                window.parent.postMessage('cancel-voice', '*');
            });
            chatinputall.appendChild(toggleButtonLeft);
        }
        
        if (!document.getElementById('toggleAnother')) {
            const toggleButtonRight = document.createElement('button');
            toggleButtonRight.className = 'material-symbols-outlined fade-in';
            toggleButtonRight.id = 'toggleAnother';
            toggleButtonRight.textContent = 'radio_button_checked';
            toggleButtonRight.style.position = 'absolute';
            toggleButtonRight.style.bottom = '10px';
            toggleButtonRight.style.right = '10px';
            toggleButtonRight.style.backgroundColor = '#linear-gradient(to right, #02218f, #0e72e3);';
            toggleButtonRight.style.color = 'white';
            toggleButtonRight.style.border = 'none';
            toggleButtonRight.style.borderRadius = '5px';
            toggleButtonRight.style.padding = '10px 15px';
            toggleButtonRight.style.cursor = 'pointer';
            toggleButtonRight.style.fontSize = '16px';
    
            toggleButtonRight.addEventListener('click', () => {
                window.parent.postMessage('voice-icon-clicked', '*');
                kandedes()
            });
            chatinputall.appendChild(toggleButtonRight);
        }
        updateUIOnRecordingStart();
    }
    function kandedes(){
        const toggleButtonLeft = document.getElementById('toggleWaveform');
        const displaywave = document.querySelector('.displaywave');
        const speakText = document.querySelector('.speak-text');
        speakText.textContent = 'Speak to the microphone';  
        if (speakaudio) {
            toggleButtonLeft.style.display = "none"
            if (!displaywave.querySelector('.speak-text')) {
                displaywave.appendChild(speakText);
            }
            speakaudio = false;
            
        } else {
            const speakText = document.querySelector('.speak-text');
            if (speakText) {
                toggleButtonLeft.style.display = "block"
                speakText.textContent = "Click the red button to start talking"
                displaywave.appendChild(speakText);
            }
            speakaudio = true;
        }
        if (!chatinputall.contains(displaywave)) {
            chatinputall.appendChild(displaywave);
        }
    }
    
    function backtotyping() {
        const chatbox = document.querySelector('.chatbox');

        chatbox.style.height = "90%";
        chatbox.style.padding = "30px 15px 80px"

        chatbox.scrollTo(0, chatbox.scrollHeight);
        
        const icon = document.getElementById('voice-icon');
        icon.style.display = "";
        icon.classList.remove('active-background');
        const messageInput = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');
        const voiceIcon = document.getElementById('voice-icon');
        const displaywave = document.querySelector('.displaywave');
        displaywave.style.display = "none"

        if (messageInput && sendBtn && voiceIcon) {
            messageInput.style.height ="40px"
            messageInput.style.display = 'inline-block';
            sendBtn.style.display = 'inline-block';
            voiceIcon.textContent = 'mic';
            voiceIcon.classList.remove('animate');
            voiceIcon.classList.remove('recording');
            chatinputall.style.height = '10%';
            chatinputall.style.background = "white" 

        const toggleButtonRight = document.getElementById('toggleAnother');
        if (toggleButtonRight) {
            toggleButtonRight.remove();
        }

        const toggleButtonleft = document.getElementById('toggleWaveform');
        if (toggleButtonleft) {
            toggleButtonleft.remove();
        }
    }}
    function formatText(content) {
        // 1. Hapus format Markdown (tanda bintang)
        content = content.replace(/\*\*/g, '');
    
        // 2. Perbaiki format daftar bernomor (tambah spasi setelah nomor)
        content = content.replace(/(\d+\.)(\S)/g, '$1 $2');
    
        // 3. Perbaiki format titik dua (tambah spasi setelah titik dua)
        content = content.replace(/(\w+):(\S)/g, '$1: $2');
    
        // 4. Pastikan ada spasi sebelum mata uang
        content = content.replace(/(\w)(\s*)(Rp|USD|\$|€|£)/g, '$1 $3');
        content = content.replace(/\s{2,}/g, ' ');

        // 5. Tambahkan spasi antara angka dan satuan/teks
        content = content.replace(/(\d+)([a-zA-Z]+)/g, '$1 $2');
    
        return content;
    }

    

    window.addEventListener('message', function(event) {
            if (event.data == "voice-fail") {
                tokenlog(0,0,total_voice_usage)
                hideLoadingAnimation()
                const incomingChatLi = createChatLi('.', 'incoming');
                const messageElement = incomingChatLi.querySelector('p');
                chatbox.scrollTo(0, chatbox.scrollHeight);
                incomingChatLi.querySelector('p').classList.add('thinking');
                chatbox.appendChild(incomingChatLi);
                messageElement.classList.remove('thinking');
                const fallback = "I couldn't quite catch that. Could you please speak closer to the microphone, or try again in a quieter environment?"
                get_voice(fallback)
                typeWriter(messageElement, fallback);
                historyChat.push({
                    role: 'assistant',
                    content: fallback
                });
                localStorage.setItem('completions', JSON.stringify(historyChat));
                
            }
            window.addEventListener('message', function(event) {
                if (event.data.startsWith("wave:")) {
                    let wave = event.data.replace('wave:', '').trim();
                    const dotElements = document.querySelectorAll('.wave .dot');
                    
                    function updateDotHeight(waveValue) {
                        const height = Math.max(10, Math.min(50, Math.abs(parseFloat(waveValue))));
                        dotElements.forEach(dot => {
                            dot.style.height = `${height}px`;
                        });
                    }
                    updateDotHeight(wave);
                }
            });
            

            if(event.data.startsWith("voice-time")){
                let voiceresult = event.data.replace('voice-time:', '').trim();
                let voiceTimeInt = parseInt(voiceresult, 10);
                tokenlog (0,0,voiceTimeInt);
            }

            if (event.data == "stop-voice-clicked") {
                backtotyping();
            }

            if (event.data == "wait-for-voice-response") {
                showLoadingAnimation();
            }

            if (event.data.startsWith("voice-result:")) {
                chatbox.scrollTo(0, chatbox.scrollHeight);
                hideLoadingAnimation();
                let voiceresult = event.data.replace('voice-result:', '').trim();
                handleChat(voiceresult);
                voice_record= true
                startStopwatch();
            }
            if (event.data === "record-start") {
                startStopwatch();
            }
            if (event.data === 'parent-loaded') {

            } else if (record) {
                record = false;
            }
        });

    const phone_regex = new RegExp(
        "\\+?(\\d{1,3})?[\\s.-]?(\\d{2,})[\\s.-]?(\\d{2,})[\\s.-]?(\\d{2,})[\\s.-]?(\\d{2,})","g");

        if (!historyChat) { // alias historyChat === null
            // kalau dari server ada greeting => pakai itu
            if (greetings.length > 0) {
              const randomIndex = Math.floor(Math.random() * greetings.length);
              localStorage.setItem('completions', JSON.stringify([{
                role: 'assistant',
                content: greetings[randomIndex]
              }]));
            } else {
              // fallback kalau server pun kosong
              localStorage.setItem('completions', JSON.stringify([{
                role: 'assistant',
                content: `Halo! Saya ${chatbotName}, ada yang bisa dibantu?`
              }]));
            }
            historyChat = JSON.parse(localStorage.getItem('completions'));
        } else {
            historyChat = JSON.parse(historyChat);
        }
        
    
    const createChatLi = (message, className) => {
        const chatLi = document.createElement('li');
        chatLi.classList.add('chat', className);
        let chatContent = className === 'outgoing' ? //dibawah <img class ditaruh  // <input type="text" />
            `<p></p>` :
            `<img class="icon-bot" src="/uploads/${chatbotId}/icon.png" onerror="this.onerror=null; this.src='/js/1.png';"><p></p>
           
            `;



        chatLi.innerHTML = chatContent;
        chatLi.querySelector('p').textContent = message;
        return chatLi;
    }
    
    historyChat.forEach(element => {
        chatbox.appendChild(createChatLi(element.content, element.role === 'assistant' ? 'incoming' : 'outgoing'));
    });
    

    async function language_translate(text) {
        const API_URL = `${window.location.origin}/chat/getlanguage/${encodeURIComponent(chatbotId)}`;
        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ body: text }),
        };
        
        try {
            const response = await fetch(API_URL, requestOptions);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            return data.language; 
        } catch (error) {

            return null;
        }
    }
    
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioContext = null;

const unlockAudioContext = () => {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
};

document.addEventListener('touchstart', () => {
    if (!audioContext) {
        audioContext = new AudioContext();
    }
    unlockAudioContext();
}, { once: true }); 

async function get_voice(text) {
    try {

        const response = await fetch('https://servicechat.wibidigital.com/send_message', {  // Ganti dengan endpoint yang baru

            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                human_input: text // Kirimkan teks ke endpoint
            }),
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        const audioUrl = data.audio_url; // Ambil URL audio yang dikembalikan

        if (audioUrl) {
            const audio = new Audio(audioUrl);
            audio.play(); // Putar audio yang dihasilkan
        }

    } catch (error) {
        console.error('Error posting user message for TTS:', error);
    }
}


    const generateResponse = (incomingChatLi) => {
        const API_URL = `${window.location.origin}/chat/completions/${encodeURIComponent(chatbotId)}`;
        const messageElement = incomingChatLi.querySelector('p');
        
        const requestOptions = {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: userMessage,
                sessionId: typeof getSessionId === 'function' ? getSessionId() : null,
                orderState: JSON.stringify(orderState)


            }),
        };
        

        
        
        

        // Modifikasi typeWriter untuk menambahkan tombol pembayaran tanpa menghilangkan tombol lain

        // Modifikasi typeWriter untuk mengganti teks pembayaran
const typeWriter = (elem, content) => {
    if (typeof(elem) !== 'undefined') {
      // Format harga dengan benar (kode sama)
      content = content.replace(/Rp\.?\s*(\d+)(?:\.(\d+))?(?:\.(\d+))?/g, (match, p1, p2, p3) => {
        let priceText = p1;
        if (p2) priceText += p2;
        if (p3) priceText += p3;
        const price = parseInt(priceText, 10);
        return formatPrice(price);
      });
  
      // Deteksi pesan pembayaran/transfer
      const isPaymentInstruction = content.includes("Silakan transfer") || 
                                   content.includes("transfer ke") ||
                                   (content.includes("BCA") && content.includes("Konfirmasi pembayaran"));
  
      // Jika ini adalah pesan pembayaran, ganti dengan pesan yang lebih simpel
      if (isPaymentInstruction) {
        // Langsung ganti konten dengan pesan yang diminta
        elem.textContent = "Silahkan melakukan pembayaran dibawah ini";
  
        // Buat tombol bayar
        const payButton = document.createElement('button');
        payButton.textContent = 'Bayar Sekarang';
        payButton.className = 'button-56';
        payButton.style.marginTop = '15px';
        payButton.addEventListener('click', async () => {
          try {
            // Tampilkan loading state
            payButton.textContent = 'Memproses...';
            payButton.disabled = true;
  
            // Kirim request ke endpoint pembayaran
            const response = await fetch("/kirim", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                payload: {
                  // isi payload yang sebelumnya langsung dikirim ke API eksternal
                }
              })
            })
            .then(response => response.json())
            .then(data => {
              // Proses response seperti biasa
              if (data.redirect_url) {
                window.location.href = data.redirect_url;
              } else {
                alert('Gagal mendapatkan link pembayaran.');
              }
            })
            .catch(error => {
              console.error("Error:", error);
            });
            
  
            if (!response.ok) {
              throw new Error('Network response was not ok');
            }
  
            const data = await response.json();
  
            // Buka halaman pembayaran di tab baru
            if (data.redirect_url) {
              window.open(data.redirect_url, '_blank');
            } else {
              throw new Error('Redirect URL not found');
            }
          } catch (error) {
            console.error('Payment error:', error);
            payButton.textContent = 'Gagal. Coba Lagi';
            setTimeout(() => {
              payButton.textContent = 'Bayar Sekarang';
              payButton.disabled = false;
            }, 3000);
          }
        });
  
        elem.appendChild(payButton);
        chatinputall.style.display = '';
        return; // Keluar dari fungsi karena sudah mengganti teks dan menambahkan tombol
      }
  
      // Kode typewriter normal untuk kasus non-pembayaran
      content = formatText(content);
      let contentIndex = 0;
      elem.textContent = "";
  
      let interval = setInterval(function() {
        elem.textContent += content[contentIndex];
        chatbox.scrollTo(0, chatbox.scrollHeight);
        contentIndex++;
  
        if (contentIndex === content.length) {
          // Cek untuk tombol konfirmasi pesanan (kode yang sudah ada)
          if (content.includes("Apakah sudah benar") || 
              content.includes("Apakah pesanan sudah benar") || 
              content.includes("Apakah semua data sudah benar")) {
            // Kode tombol konfirmasi yang sudah ada...
            const confirmButton = document.createElement('button');
            confirmButton.textContent = 'Ya, Sudah Benar';
            confirmButton.className = 'button-pay';
            confirmButton.addEventListener('click', () => {
              handleChat("Sudah benar");
            });
            elem.appendChild(confirmButton);
  
            const changeButton = document.createElement('button');
            changeButton.textContent = 'Ubah Pesanan';
            changeButton.className = 'button-pay';
            changeButton.style.backgroundColor = '#f44336';
            changeButton.addEventListener('click', () => {
              handleChat("Saya ingin mengubah pesanan");
            });
            elem.appendChild(changeButton);
          }
  
          // Kode phone regex dan lainnya...
          chatinputall.style.display = '';
          clearInterval(interval);
        }
      }, 25);
    }
  };
  
  
  
        
        fetch(API_URL, requestOptions)
            .then(res => {
                return res.json();
            })
            .then(data => {
                tokenlog(data.input_token, data.output_token, total_voice_usage)
                messageElement.classList.remove('thinking');
                let formattedContent = formatText(data.content.replace('\n\n', ''));

                if (voice_record){
                    get_voice(data.content)    
                    voice_record = false
                }
                typeWriter(messageElement, formattedContent);
                // typeWriter(messageElement, data.content.replace('\n\n', ''));
                historyChat.push({
                    role: 'user',
                    content: userMessage
                });
                historyChat.push({
                    role: 'assistant',
                    content: data.content.replace('\n\n', '')
                });
                localStorage.setItem('completions', JSON.stringify(historyChat));
            })
            .catch((error) => {
                console.error('Fetch error:', error);
                messageElement.classList.add('error');
                messageElement.textContent = "Oops! Something went wrong. Please try again";
                chatinputall.style.display = 'block';
            });
            
    }

    chatbox.scrollTo(0, chatbox.scrollHeight);
    
    const handleChat = (message) => {
        userMessage = message;
      
        // Deteksi produk spesifik
        const productInfo = detectSpecificProduct(message);
        if (productInfo) {
          console.log("Produk spesifik terdeteksi:", productInfo);
          orderState.items = [{
            name: productInfo.product,
            quantity: 1,
            price: productInfo.price
          }];
          orderState.stage = "PRODUCT_MENTIONED";
          orderState.currentProduct = productInfo;
        }
      
        // Analisis pesanan
        const orderInfo = parseOrderRequest(message);
        if (orderInfo) {
          console.log("Pesanan terdeteksi:", orderInfo);
          // Jika ada informasi harga, gunakan itu
          if (orderInfo.price) {
            orderState.items = [{
              name: orderInfo.item,
              quantity: orderInfo.quantity || 1,
              price: orderInfo.price
            }];
          } else {
            // Jika tidak ada harga, coba cari produk yang cocok
            const product = detectSpecificProduct(orderInfo.item);
            if (product) {
              orderState.items = [{
                name: product.product,
                quantity: orderInfo.quantity || 1,
                price: product.price
              }];
            } else {
              // Jika produk tidak ditemukan, simpan tanpa harga
              orderState.items = [{
                name: orderInfo.item,
                quantity: orderInfo.quantity || 1
              }];
            }
          }
          orderState.stage = "INITIAL";
          orderState.confirmed = false;
          orderState.customerData = null;
        } 
      
        // Jika konfirmasi produk
        if (isOrderConfirmation(message) && 
            (orderState.stage === "INITIAL" || orderState.stage === "PRODUCT_MENTIONED")) {
          console.log("Konfirmasi produk terdeteksi");
          orderState.stage = "PRODUCTS_CONFIRMED";
      
          // Jika ada produk terakhir yang disebutkan di riwayat, gunakan itu
          if (orderState.items.length === 0) {
            const lastProduct = findLastProductInHistory();
            if (lastProduct) {
              orderState.items = [{
                name: lastProduct.product,
                quantity: 1,
                price: lastProduct.price
              }];
            }
          }
        } 
        else if (isOrderConfirmation(message) && orderState.stage === "CUSTOMER_DATA_REQUESTED" && 
                 orderState.customerData) {
          console.log("Konfirmasi final terdeteksi");
          orderState.stage = "FINAL_CONFIRMATION";
          orderState.confirmed = true;
        }
      
        // Jika penolakan pesanan
        if (isOrderRejection(message)) {
          console.log("Penolakan pesanan terdeteksi");
          if (orderState.stage !== "FINAL_CONFIRMATION") {
            orderState.stage = "INITIAL";
          }
        }
      
        // Jika input data pelanggan
        const customerData = parseCustomerData(message);
        if (customerData) {
          console.log("Data pelanggan terdeteksi:", customerData);
          // Validasi data pelanggan
          if (validateCustomerData(customerData)) {
            orderState.customerData = customerData;
            orderState.stage = "CUSTOMER_DATA_REQUESTED";
          }
        }
      
        // Proses pesan seperti biasa
        postUserMessage(userMessage);
        if (!userMessage) return;
        chatinputall.style.display = 'none';
      
        chatInput.value = '';
        chatInput.style.height = `${inputInitHeight}px`;
        chatbox.appendChild(createChatLi(userMessage, 'outgoing'));
        chatbox.scrollTo(0, chatbox.scrollHeight);
      
        setTimeout(() => {
          const incomingChatLi = createChatLi('.', 'incoming');
          chatbox.scrollTo(0, chatbox.scrollHeight);
          incomingChatLi.querySelector('p').classList.add('thinking');
          chatbox.appendChild(incomingChatLi);
          generateResponse(incomingChatLi);
        }, 600);
      }
      
    
    
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleChat(chatInput.value.trim());
        }
        if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault();
        }
    });
    
    function showLoadingAnimation() {
            const toggleButtonLeft = document.getElementById('toggleWaveform');
            toggleButtonLeft.style.display = "block"
            const displaywave = document.querySelector('.displaywave');
            const speakText = document.querySelector('.speak-text');
            speakText.textContent = 'Click the red button to start talking';
            displaywave.append(speakText)
            speakaudio = true
        

        const overlay = document.createElement('div');
        overlay.classList.add('loading-overlay');
        overlay.id = 'loadingOverlay';
    
        const loadingWave = document.createElement('div');
        loadingWave.classList.add('loading-wave');
        loadingWave.innerHTML = `
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        `;
    
        overlay.appendChild(loadingWave);
        chatbox.appendChild(overlay);
    }
    
    function hideLoadingAnimation() {
        var loadingOverlay = document.querySelector('.loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    }
    

    // GANTI event listener refreshChatBtn dengan:
    refreshChatBtn.addEventListener('click', (e) => {
        // TAMBAHAN: Reset order state
        orderState = {
            items: [],
            confirmed: false,
            customerData: null
        };

        // Kode asli
        localStorage.removeItem('completions');
        chatbox.innerHTML = '';
        location.reload();
    });

    

    sendChatBtn.addEventListener("click", function(){
        handleChat(chatInput.value.trim())
    })

    voiceIcon.addEventListener('click', function() {
        startStopwatch();
        kandedes();
        window.parent.postMessage('voice-icon-clicked', '*');
        chatbox.scrollTo(0, chatbox.scrollHeight);
        unlockAudioContext();
    });  


    const chatMessages = document.querySelectorAll('.chatbox .chat p');
    chatMessages.forEach((message) => {
    message.addEventListener('click', async function() {
        get_voice(this.textContent);
    
    // TAMBAHKAN di akhir file
    // Export untuk iframe.ejs
    window.resetOrderState = function() {
        orderState = {
            items: [],
            confirmed: false,
            customerData: null
        };
        console.log("Order state direset");
    }

    // Event listener untuk reset dari iframe
    document.addEventListener('sessionReset', function(event) {
        if (event.detail && event.detail.chatbotId === chatbotId) {
            window.resetOrderState();
        }
    });

    })})})
