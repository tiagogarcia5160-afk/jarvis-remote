// Configurações
let ipServidor = '';
let porta = '5000';
let conectado = false;

// Elementos DOM
let statusLed, statusText, ipInput, connectBtn, manualInput, sendBtn, voiceBtn, logContainer;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    // Pegar elementos
    statusLed = document.getElementById('statusLed');
    statusText = document.getElementById('statusText');
    ipInput = document.getElementById('ipInput');
    connectBtn = document.getElementById('connectBtn');
    manualInput = document.getElementById('manualInput');
    sendBtn = document.getElementById('sendBtn');
    voiceBtn = document.getElementById('voiceBtn');
    logContainer = document.getElementById('logContainer');
    
    // Carregar IP salvo
    const ipSalvo = localStorage.getItem('jarvis_ip');
    if (ipSalvo) {
        ipInput.value = ipSalvo;
    }
    
    // Botão conectar
    connectBtn.addEventListener('click', conectar);
    
    // Botões de comando
    document.querySelectorAll('.cmd-btn[data-cmd]').forEach(btn => {
        btn.addEventListener('click', function() {
            const comando = this.getAttribute('data-cmd');
            enviarComando(comando);
        });
    });
    
    // Botão enviar manual
    sendBtn.addEventListener('click', function() {
        if (manualInput.value.trim()) {
            enviarComando(manualInput.value.trim());
            manualInput.value = '';
        }
    });
    
    // Enter no input manual
    manualInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && this.value.trim()) {
            enviarComando(this.value.trim());
            this.value = '';
        }
    });
    
    // Botão de voz
    if (voiceBtn) {
        voiceBtn.addEventListener('click', iniciarReconhecimentoVoz);
    }
    
    // Atualizar estado dos botões
    atualizarEstadoBotoes();
});

function adicionarLog(mensagem) {
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = `[${hora}] ${mensagem}`;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

function atualizarEstadoBotoes() {
    const botoes = document.querySelectorAll('.cmd-btn, #sendBtn, #voiceBtn, #manualInput');
    botoes.forEach(btn => {
        if (btn.id === 'manualInput') {
            btn.disabled = !conectado;
        } else {
            btn.disabled = !conectado;
        }
    });
}

async function conectar() {
    ipServidor = ipInput.value.trim();
    
    if (!ipServidor) {
        alert('Digite o IP do computador');
        return;
    }
    
    adicionarLog(`🔄 Conectando a ${ipServidor}:${porta}...`);
    
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`http://${ipServidor}:${porta}/status`, {
            method: 'GET',
            mode: 'cors',
            signal: controller.signal
        });
        
        clearTimeout(timeout);
        
        if (response.ok) {
            conectado = true;
            localStorage.setItem('jarvis_ip', ipServidor);
            
            statusLed.classList.add('online');
            statusText.textContent = 'CONECTADO';
            connectBtn.innerHTML = '<span class="btn-icon">⚡</span> DESCONECTAR';
            
            adicionarLog(`✅ Conectado a ${ipServidor}:${porta}`);
            atualizarEstadoBotoes();
        } else {
            throw new Error('Servidor não respondeu');
        }
    } catch (error) {
        conectado = false;
        statusLed.classList.remove('online');
        statusText.textContent = 'FALHA';
        connectBtn.innerHTML = '<span class="btn-icon">⚡</span> CONECTAR';
        
        adicionarLog(`❌ Erro: ${error.message}`);
        alert(`Não foi possível conectar:\n${error.message}`);
        atualizarEstadoBotoes();
    }
}

async function enviarComando(comando) {
    if (!conectado) {
        alert('Conecte ao servidor primeiro');
        return;
    }
    
    adicionarLog(`📤 Enviando: ${comando}`);
    
    try {
        const response = await fetch(`http://${ipServidor}:${porta}`, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ command: comando })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            adicionarLog(`✅ Comando executado: ${comando}`);
        } else {
            adicionarLog(`❌ Erro: ${data.mensagem || 'Servidor não respondeu'}`);
        }
    } catch (error) {
        adicionarLog(`❌ Erro de rede: ${error.message}`);
        
        // Se perdeu conexão
        conectado = false;
        statusLed.classList.remove('online');
        statusText.textContent = 'DESCONECTADO';
        connectBtn.innerHTML = '<span class="btn-icon">⚡</span> CONECTAR';
        atualizarEstadoBotoes();
    }
}

function iniciarReconhecimentoVoz() {
    if (!('webkitSpeechRecognition' in window)) {
        alert('Seu navegador não suporta reconhecimento de voz');
        return;
    }
    
    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = function() {
        voiceBtn.classList.add('listening');
        document.querySelector('.voice-waves').classList.add('active');
        document.querySelector('.voice-status').textContent = 'Ouvindo...';
        adicionarLog('🎤 Ouvindo...');
    };
    
    recognition.onend = function() {
        voiceBtn.classList.remove('listening');
        document.querySelector('.voice-waves').classList.remove('active');
        document.querySelector('.voice-status').textContent = 'Toque para falar';
    };
    
    recognition.onresult = function(event) {
        const comando = event.results[0][0].transcript;
        adicionarLog(`🎤 Você disse: "${comando}"`);
        enviarComando(comando);
    };
    
    recognition.onerror = function() {
        adicionarLog('❌ Erro no reconhecimento de voz');
        voiceBtn.classList.remove('listening');
        document.querySelector('.voice-waves').classList.remove('active');
        document.querySelector('.voice-status').textContent = 'Toque para falar';
    };
    
    recognition.start();
}