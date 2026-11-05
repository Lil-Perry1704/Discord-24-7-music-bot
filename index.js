const { Client, GatewayIntentBits } = require('discord.js');
const { 
    joinVoiceChannel, 
    createAudioPlayer, 
    createAudioResource, 
    AudioPlayerStatus, 
    VoiceConnectionStatus, 
    entersState 
} = require('@discordjs/voice');
const http = require('http');

// --- ĐIỀN THÔNG TIN CỦA BẠN VÀO ĐÂY ---
const TOKEN = 'MTU2NzU1MTIzMTQwNzQyNzY5NQ.GP7eql.gqqyqmDlSM6HA9m0J9E2kD0JD7NoS0IM9825bs';
const GUILD_ID = '1218972991455756328';
const VOICE_CHANNEL_ID = '1567548383973867600';
const STREAM_URL = 'https://www.youtube.com/watch?v=lmYlOxyOESw';
const VOLUME = 0.5; // Âm lượng từ 0.0 đến 1.0 (0.5 = 50%)
// ---------------------------------------

// Tạo một HTTP server đơn giản để Koyeb "ping" giữ ứng dụng luôn sống 24/7
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot Discord dang chay 24/7!\n');
});
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
    console.log(`HTTP server đang chạy trên cổng ${PORT}`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const player = createAudioPlayer();

function playStream() {
    const resource = createAudioResource(STREAM_URL, {
        inputType: require('@discordjs/voice').StreamType.Arbitrary,
        inlineVolume: true
    });

    resource.volume.setVolume(VOLUME);
    player.play(resource);
}

async function connectToChannel() {
    try {
        const guild = await client.guilds.fetch(GUILD_ID);
        const channel = await guild.channels.fetch(VOICE_CHANNEL_ID);

        if (!channel || !channel.isVoiceBased()) {
            console.error('Không tìm thấy kênh thoại!');
            return;
        }

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true
        });

        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
        console.log(`Đã kết nối vào phòng thoại: ${channel.name}`);

        connection.subscribe(player);
        playStream();

        player.on(AudioPlayerStatus.Idle, () => {
            playStream();
        });

        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
            } catch (error) {
                connection.destroy();
                connectToChannel();
            }
        });

    } catch (error) {
        console.error('Lỗi kết nối Voice Channel:', error);
        setTimeout(connectToChannel, 10_000);
    }
}

player.on('error', error => {
    console.error('Lỗi luồng Audio:', error.message);
    setTimeout(playStream, 5_000);
});

client.once('ready', () => {
    console.log(`Bot đã sẵn sàng: ${client.user.tag}`);
    connectToChannel();
});

client.login(TOKEN);