class WebSocketClient {
    constructor() {
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 3000;
        this.messageCount = 0;

        this.statusElement = document.getElementById('status-text');
        this.indicatorElement = document.getElementById('indicator');
        this.messagesElement = document.getElementById('messages');
        this.connectBtn = document.getElementById('connect-btn');
        this.disconnectBtn = document.getElementById('disconnect-btn');
        this.sendTestBtn = document.getElementById('send-test-btn');


        this.connectWebSocket();
    }

    connectWebSocket() {
        try {

            this.socket = new WebSocket('ws://localhost:3000');

            this.socket.onopen = (event) => {
                this.updateStatus('Conectado', 'connected');
                this.reconnectAttempts = 0;
                this.updateButtons(true);
                this.addMessage('Sistema', 'Conexión establecida exitosamente', 'system');
            };

            this.socket.onmessage = (event) => {
                console.log('Mensaje recibido:', event.data);
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('Error', error);

                }
            };

            this.socket.onclose = (event) => {
                console.log('WebSocket cerrado:', event);
                this.updateStatus('Desconectado', 'disconnected');
                this.updateButtons(false);
            };


        } catch (error) {
            console.error('Error', error);
        }
    }

    disconnectWebSocket() {
        if (this.socket) {
            this.socket.close(1000, 'Desconexión manual');
            this.socket = null;
        }
    }

    sendTestMessage() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            const message = {
                type: 'test',
                content: `Mensaje de prueba #${++this.messageCount}`,
                timestamp: new Date().toISOString(),
                clientId: this.generateClientId()
            };

            this.socket.send(JSON.stringify(message));
            this.addMessage('Cliente', message.content, 'sent');
        } else {
            this.addMessage('Error', 'WebSocket no está conectado', 'error');
        }
    }

    handleMessage(data) {
        switch (data.type) {
            case 'welcome':
                this.addMessage('Servidor', data.message, 'welcome');
                break;
            case 'broadcast':
                this.addMessage('Broadcast', data.message, 'broadcast');
                break;
            case 'echo':
                this.addMessage('Echo', data.message, 'received');
                break;
            case 'heartbeat':
                console.log('Heartbeat recibido');
                break;
            default:
                this.addMessage('Servidor', data.message || JSON.stringify(data), 'received');
        }
    }

    addMessage(sender, content, type = 'default') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;

        const timestamp = new Date().toLocaleTimeString();
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="sender">${sender}</span>
                <span class="timestamp">${timestamp}</span>
            </div>
            <div class="message-content">${content}</div>
        `;

        this.messagesElement.appendChild(messageDiv);
        this.messagesElement.scrollTop = this.messagesElement.scrollHeight;


        const messages = this.messagesElement.querySelectorAll('.message');
        if (messages.length > 100) {
            messages[0].remove();
        }
    }

    updateStatus(text, className) {
        this.statusElement.textContent = text;
        this.indicatorElement.className = `indicator ${className}`;
    }

    updateButtons(connected) {
        this.connectBtn.disabled = connected;
        this.disconnectBtn.disabled = !connected;
        this.sendTestBtn.disabled = !connected;
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            this.updateStatus(`Reconectando... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`, 'connecting');

            setTimeout(() => {
                this.connectWebSocket();
            }, this.reconnectInterval);
        } else {
            this.updateStatus('Reconexión fallida', 'error');
            this.addMessage('Sistema', 'Se agotaron los intentos de reconexión', 'error');
        }
    }

    generateClientId() {
        return 'client_' + Math.random().toString(36).substr(2, 9);
    }
}


let wsClient;

function connectWebSocket() {
    if (wsClient) {
        wsClient.connectWebSocket();
    }
}

function disconnectWebSocket() {
    if (wsClient) {
        wsClient.disconnectWebSocket();
    }
}

function sendTestMessage() {
    if (wsClient) {
        wsClient.sendTestMessage();
    }
}


document.addEventListener('DOMContentLoaded', () => {
    wsClient = new WebSocketClient();
});


window.addEventListener('beforeunload', () => {
    if (wsClient && wsClient.socket) {
        wsClient.socket.close();
    }
});