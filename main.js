const fs = require('fs');
const discord = require('discord.js');
const DISCORD_MAX_DESCRIPTION_LENGTH = 2048;
const DISCORD_GUILD = '238666723824238602';
const DISCORD_CHANNEL = '453335797832089631';
const ORDERED_LIST_REGEX = new RegExp('[0-9]+.(.*)');

const tokenFactory = () => 'token_gathering_method_here';
const DISCORD_TOKEN = tokenFactory();

const getMarkdownText = async () => (
    new Promise((res, rej) => fs.readFile('README.md', 'utf8', (err, data) => {
        if (err) return rej(err);
        res(data);
    }))
);

const parseMarkdownToSegments = (text) => {
    const lines = text.split('\n')
                      .map((line) => line.trim())
                      .filter((line) => line !== '');

    const segments = [];
    let i = 0;
    let a = '';
    for (const line of lines) {
        if (line.startsWith('##')) {
            const title = line.split('##')[1].trim();
            segments.push([title]);
            continue;
        }

        const match = ORDERED_LIST_REGEX.exec(line);
        const segmentIndex = segments.length - 1
        if (match) {
            const el = match[1].trim();
            segments[segmentIndex].push({ bullet: false, text: el });
        } else if (line.startsWith('-')) {
            const el = line.split('-').slice(1).join('-').trim();
            segments[segmentIndex].push({ bullet: true, text: el });
        } else {
            segments[segmentIndex][segments[segmentIndex].length - 1].text += ` ${line}`;
        }
    }

    segments.map((segment) => segment.map((line) => line.text ?
        line.text.replace('<br>', '\n') :
        line.replace('<br>', '\n')));

    return segments;
}

const segmentsToEmbeds = (segments) => {
    const embedTexts = [];
    for (const segment of segments) {
        const [title, ...lines] = segment;
        const parts = [''];
        let size = 0;
        let i = 0;
        for (const line of lines) {
            const text = line.text;
            const isBullet = line.bullet;

            let actualText;
            if (!isBullet) {
                i++;
                actualText = `**${i}.** ${text}`;
            } else {
                actualText = `• ${text}`;
            }

            if ((size + actualText.length + 1) >= DISCORD_MAX_DESCRIPTION_LENGTH) {
                parts.push(actualText);
                size = actualText.length;
            } else {
                parts[parts.length - 1] += `\n\n${actualText}`;
                size += actualText.length + 1;
            }
        }

        embedTexts.push(parts.map(part => part.trim().replace('<br>', '')));
    }

    return embedTexts;
}

const client = new discord.Client();

client.on('ready', async () => {
    const guild = client.guilds.get(DISCORD_GUILD);
    if (!guild) {
        process.exit(1);
    }
    const channel = guild.channels.get(DISCORD_CHANNEL);
    if (!channel) {
        process.exit(1);
    }

    const markdownText = await getMarkdownText();
    const segments = parseMarkdownToSegments(markdownText);
    const embedTexts = segmentsToEmbeds(segments);

    let i = 0;
    for (const segment of segments) {
        const [title, ...rest] = segment;
        for (let k = 0; k < embedTexts[i].length; k++) {
            let embed = new discord.RichEmbed();
            if (k === 0) {
                embed.setAuthor(guild.name, guild.iconURL, 'https://progdisc.club');
                embed.setTitle(title);
            }

            if (i === 0) {
                embed.setFooter('Updated on');
                embed.setTimestamp(new Date());
            }

            embed.setColor('#4286F4');
            embed.setDescription(embedTexts[i][k]);
            await channel.send('', embed);
        }

        i++;
    }
});
client.login(DISCORD_TOKEN);
