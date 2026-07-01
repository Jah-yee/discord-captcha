const axios = require('axios');
const { MessageEmbed } = require('discord.js');
const { EventEmitter } = require('events');

class Captcha extends EventEmitter {
    Captcha_Emit = this
    constructor(client, options) {
        super();
        this.client = client;
        this.options = options;
        require('discord-buttons')(client);

        client.on('ready', async () => {

            if (!options.channelID) return console.log('\x1b[31mError\x1b[0m You did not provide a channel ID!');

            if (!options.roleID) return console.log('\x1b[31mError\x1b[0m You did not provide a role ID!');

            const Channel = client.channels.cache.find(channel => channel.id === options.channelID);

            if (!Channel) return console.log('\x1b[93mWarning\x1b[0m The channel ' + options.channelID + ' does not exist or I do not have perms to see it.');

            const Role = Channel.guild.roles.cache.find(role => role.id === options.roleID);

            if (!Role) return console.log('\x1b[93mWarning\x1b[0m The role ' + options.roleID + ' does not exist.');

            const Messages = await Channel.messages.fetch({
                limit: 100
            });

            if (1 < Messages.size) return console.log('\x1b[93mWarning\x1b[0m There are messages in the channel. Please delete them before running.');

            if (Messages.first()) {
                if (!Messages.first().author.bot) return console.log('\x1b[93mWarning\x1b[0m There are messages in the channel. Please delete them before running.');
            } else {
                Channel.send('', {
                    button: {
                        "type": 2,
                        "style": 1,
                        "label": 'Verify',
                        "disabled": false,
                        "custom_id": 'Verify_Button'
                    },
                    embed: {
                        "title": 'Verification',
                        "type": 'rich',
                        "description": 'Press Verify to gain access to the rest of the server!',
                        "color": 5793266,
                    }
                }).catch(err => {
                    console.log("\x1b[31mError\x1b[0m I can not send messages in the verifiecation channel!");
                })
            }

            client.on('message', message => {
                if (message.channel.id === options.channelID) {
                    if (message.author.bot) return;
                    message.delete({
                        timeout: 250
                    })
                }
            })
            const Emit = this.Captcha_Emit

            function succeeded(info) {
                Emit.emit('success', info)
            }

            function failed(info) {
                Emit.emit('failure', info)
            }

            client.on('clickButton', async (button) => {

                if (button.id === 'Verify_Button') {

                    let trys = 0

                    async function captcha() {

                        const response = await axios.default.get('https://api.no-api-key.com/api/v2/captcha');

                        const Failed = new MessageEmbed()
                            .setDescription('Verification failed! Please try again.')
                            .setImage(response.data.captcha);

                        if (trys > 0) button.reply.edit({
                            embed: Failed,
                            content: null,
                            ephemeral: true
                        })

                        const Embed = new MessageEmbed()
                            .setImage(response.data.captcha);

                        if (trys == 0) await button.reply.send({
                            embed: Embed,
                            content: null,
                            ephemeral: true
                        })

                        const filter = m => m.author.id === button.clicker.id;

                        const collecter = button.channel.createMessageCollector(filter, {
                            max: 1
                        });

                        collecter.on("end", (resp) => {

                            resp.forEach((val) => {

                                let ans = val.content === response.data.captcha_text ? true : false;
                                trys++
                                let info = {
                                    succeeded: ans,
                                    trys: trys,
                                    response: val.content,
                                    correct_response: response.data.captcha_text,
                                    user: button.clicker.member.user,
                                }
                                if (ans == true) {

                                    if (!button.clicker.member.manageable) {
                                      console.log('\x1b[93mWarning\x1b[0m I do not have permission to give users the verified role.')
                                      return button.reply.edit(`I dont not have permission to give you <@&${options.roleID}>`, true)
                                    }
                                    button.clicker.member.roles.add(options.roleID).catch(err => {})
                                    button.reply.edit(`You have been verified in ${button.guild.name}`, true);
                                    succeeded(info);
                                } else {
                                    failed(info);
                                    captcha()
                                }
                            })
                        });
                    }
                    captcha()
                }
            })

        });

    }
}

module.exports = Captcha