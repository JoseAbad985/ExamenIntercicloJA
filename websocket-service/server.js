const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

class WebSocketServer {
    constructor(port = 3000) {
        this.port = port;
        this.clients = new Map();
        this.server = null;
        this.heartbeatInterval = null;

        this.init();
    }

    init() {

        this.server = new WebSocket.Server({
            port: this.port,
            perMessageDeflate: {
                zlibDeflateOptions: {
                    maxNoContextTakeover: false,
                    maxWindowBits: 13,
                }
            }
        });



        this.setupHeartbeat();

    }

    handleConnection(ws, request) {
        const clientId = uuidv4();
        const clientInfo = {
            id: clientId,
            socket: ws,
            ip: request.socket.remoteAddress,
            userAgent: request.headers['user-agent'],
            connectedAt: new Date(),
            isAlive: true,
            messageCount: 0
        };


        this.clients.set(clientId, clientInfo);



        ws.isAlive = true;
        ws.on('pong', () => {
            ws.isAlive = true;
        });


        this.sendMessage(ws, {
            type: 'welcome',
            message: `¡Bienvenido! Tu ID de cliente es: ${clientId}`,
            clientId: clientId,
            timestamp: new Date().toISOString(),
            connectedClients: this.clients.size
        });


        this.broadcast({
            type: 'broadcast',
            message: `Un nuevo cliente se ha conectado. Total: ${this.clients.size} clientes`,
            timestamp: new Date().toISOString()
        }, clientId);


        ws.on('message', (data) => {
            this.handleMessage(clientId, data);
        });


        ws.on('close', (code, reason) => {
            this.handleDisconnection(clientId, code, reason);
        });

    }

    handleMessage(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client) return;

        try {
            const message = JSON.parse(data.toString());
            client.messageCount++;

            console.log(`📨 Mensaje de ${clientId}:`, message);


            switch (message.type) {
                case 'test':
                    this.handleTestMessage(clientId, message);
                    break;

                case 'broadcast':
                    this.handleBroadcastMessage(clientId, message);
                    break;

                case 'ping':
                    this.handlePingMessage(clientId, message);
                    break;

                default:
                    this.handleGenericMessage(clientId, message);
            }

        } catch (error) {
            console.error(`Error al procesar mensaje de ${clientId}:`, error);
            this.sendMessage(client.socket, {
                type: 'error',
                message: 'Formato de mensaje inválido',
                timestamp: new Date().toISOString()
            });
        }
    }

    handleTestMessage(clientId, message) {
        const client = this.clients.get(clientId);


        this.sendMessage(client.socket, {
            type: 'echo',
            message: `Echo: ${message.content}`,
            originalMessage: message,
            timestamp: new Date().toISOString()
        });


        this.broadcast({
            type: 'broadcast',
            message: `Cliente ${clientId.substring(0, 8)} envió: ${message.content}`,
            timestamp: new Date().toISOString()
        }, clientId);
    }

    handleBroadcastMessage(clientId, message) {
        this.broadcast({
            type: 'broadcast',
            message: message.content,
            from: clientId,
            timestamp: new Date().toISOString()
        }, clientId);
    }

    handlePingMessage(clientId, message) {
        const client = this.clients.get(clientId);
        this.sendMessage(client.socket, {
            type: 'pong',
            message: 'pong',
            timestamp: new Date().toISOString(),
            serverTime: Date.now()
        });
    }

    handleGenericMessage(clientId, message) {
        const client = this.clients.get(clientId);


        this.sendMessage(client.socket, {
            type: 'response',
            message: `Mensaje recibido: ${JSON.stringify(message)}`,
            timestamp: new Date().toISOString()
        });
    }

    handleDisconnection(clientId, code, reason) {
        const client = this.clients.get(clientId);
        if (!client) return;

        console.log(` Cliente desconectado: ${clientId}`);
        console.log(`   Código: ${code}, Razón: ${reason || 'No especificada'}`);
        console.log(`   Mensajes enviados: ${client.messageCount}`);
        console.log(`   Duración conexión: ${Date.now() - client.connectedAt.getTime()}ms`);

        this.clients.delete(clientId);

        console.log(`👥 Clientes conectados: ${this.clients.size}`);


        this.broadcast({
            type: 'broadcast',
            message: `Un cliente se ha desconectado. Total: ${this.clients.size} clientes`,
            timestamp: new Date().toISOString()
        });
    }

    sendMessage(socket, data) {
        if (socket.readyState === WebSocket.OPEN) {
            try {
                socket.send(JSON.stringify(data));
            } catch (error) {
                console.error('Error al enviar mensaje:', error);
            }
        }
    }

    broadcast(data, excludeClientId = null) {
        this.clients.forEach((client, clientId) => {
            if (clientId !== excludeClientId) {
                this.sendMessage(client.socket, data);
            }
        });
    }

    setupHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            this.clients.forEach((client, clientId) => {
                if (client.socket.isAlive === false) {
                    console.log(`💀 Cliente ${clientId} no responde al heartbeat, cerrando conexión`);
                    client.socket.terminate();
                    this.clients.delete(clientId);
                    return;
                }

                client.socket.isAlive = false;
                client.socket.ping();
            });


            this.broadcast({
                type: 'heartbeat',
                timestamp: new Date().toISOString(),
                connectedClients: this.clients.size
            });

        }, 30000); // Cada 30 segundos
    }

    getStats() {
        return {
            connectedClients: this.clients.size,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            clients: Array.from(this.clients.entries()).map(([id, client]) => ({
                id,
                ip: client.ip,
                connectedAt: client.connectedAt,
                messageCount: client.messageCount
            }))
        };
    }

    shutdown() {
        console.log('Cerrando servidor WebSocket.');

        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }


        this.clients.forEach((client) => {
            client.socket.close(1001, 'Servidor cerrando');
        });


        this.server.close(() => {
            console.log('Servidor WebSocket cerrado correctamente');
            process.exit(0);
        });
    }
}


const wsServer = new WebSocketServer(3000);


process.on('SIGTERM', () => wsServer.shutdown());
process.on('SIGINT', () => wsServer.shutdown());


process.on('SIGUSR1', () => {
    console.log('Estadísticas del servidor:', JSON.stringify(wsServer.getStats(), null, 2));
});



