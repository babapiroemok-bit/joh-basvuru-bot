const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  REST,
  Routes,
  SlashCommandBuilder,
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel, Partials.Message],
});

const { setupWatchdog } = require('./watchdog');

const TOKEN     = process.env.BASVURU_TOKEN;
const GUILD_ID  = process.env.GUILD_ID;
const CLIENT_ID = '1505286602505719848';
const UST_ROL_ID = '1505270476652413079';

const activeApplications = new Map();

const JOH_RUTBELER = [
  { name: '👑 Genel Başkan',       color: 0xFFD700 },
  { name: '⭐ Başkan Yardımcısı',  color: 0xFFA500 },
  { name: '🔰 Genel Müdür',        color: 0xC0C0C0 },
  { name: '🎖️ Bölge Komutanı',    color: 0x8B0000 },
  { name: '🏅 Kıdemli Subay',      color: 0x4169E1 },
  { name: '⚔️ Subay',              color: 0x1E90FF },
  { name: '🛡️ Kıdemli Astsubay',  color: 0x2E8B57 },
  { name: '🎯 Astsubay',           color: 0x32CD32 },
  { name: '🔫 Kıdemli Uzman',      color: 0x9370DB },
  { name: '💪 Uzman',              color: 0xBA55D3 },
  { name: '🪖 Kıdemli Çavuş',     color: 0xFF6347 },
  { name: '🎗️ Çavuş',             color: 0xFF4500 },
  { name: '📋 Onbaşı',             color: 0xDAA520 },
  { name: '🆕 Er',                 color: 0x808080 },
  { name: '🎓 Stajyer',            color: 0x00CED1 },
];

// ── SLASH COMMANDS ────────────────────────
const commands = [
  new SlashCommandBuilder()
    .setName('panel')
    .setDescription('🪖 Başvuru panelini bu kanala kurar')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName('rutbe-kur')
    .setDescription('🎖️ Tüm JÖH rütbelerini sunucuya oluşturur')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName('log-kur')
    .setDescription('📋 Bu kanalı başvuru log kanalı olarak ayarlar')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder()
    .setName('yardim')
    .setDescription('📖 Başvuru botunun tüm komutlarını gösterir'),
].map((c) => c.toJSON());

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('✅ Slash komutları kaydedildi.');
  } catch (e) {
    console.error('❌ Komut kaydı hatası:', e.message);
  }
}

// ── LOG HELPER ────────────────────────────
async function sendLog(guild, embed) {
  const ch = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildText && (c.name.toLowerCase().includes('basvuru-log') || c.name.toLowerCase().includes('başvuru-log'))
  );
  if (ch) await ch.send({ embeds: [embed] }).catch(() => {});
}

// ── READY ─────────────────────────────────
client.once('ready', async () => {
  console.log(`✅ Başvuru Bot aktif: ${client.user.tag}`);
  await registerCommands();
  await setupRoles();
  setupWatchdog(client, TOKEN, GUILD_ID);
});

async function setupRoles() {
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return;
  for (const rutbe of JOH_RUTBELER) {
    if (!guild.roles.cache.find((r) => r.name === rutbe.name)) {
      try {
        await guild.roles.create({ name: rutbe.name, color: rutbe.color, reason: 'JÖH Bot' });
        await new Promise((r) => setTimeout(r, 400));
      } catch {}
    }
  }
  console.log('✅ Rütbe kurulumu tamamlandı.');
}

// ── INTERACTION HANDLER ───────────────────
client.on('interactionCreate', async (interaction) => {

  // ── COMMANDS ──
  if (interaction.isChatInputCommand()) {
    const { commandName } = interaction;

    if (commandName === 'yardim') {
      const embed = new EmbedBuilder()
        .setTitle('🪖 JÖH Başvuru Bot — Yardım')
        .setDescription('Aşağıda botun tüm komutları ve açıklamaları yer almaktadır.')
        .setColor(0x2F3136)
        .addFields(
          { name: '⚙️ Admin Komutları', value: '\u200b', inline: false },
          { name: '/panel',      value: 'Başvuru panelini bu kanala kurar',             inline: true },
          { name: '/rutbe-kur',  value: 'Tüm JÖH rütbelerini sunucuya oluşturur',      inline: true },
          { name: '/log-kur',    value: 'Bu kanalı başvuru log kanalı yapar',           inline: true },
          { name: '\u200b',      value: '\u200b',                                        inline: false },
          { name: '📖 Genel Komutlar', value: '\u200b',                                 inline: false },
          { name: '/yardim',     value: 'Bu yardım menüsünü gösterir',                  inline: true },
          { name: '\u200b',      value: '\u200b',                                        inline: false },
          { name: '🖱️ Panel Butonları', value: '\u200b',                               inline: false },
          { name: '⚔️ Subay',          value: 'Subay rütbesi için başvurur',            inline: true },
          { name: '🛡️ Astsubay',       value: 'Astsubay rütbesi için başvurur',         inline: true },
          { name: '🔫 Uzman',           value: 'Uzman rütbesi için başvurur',            inline: true },
          { name: '🪖 Çavuş',           value: 'Çavuş rütbesi için başvurur',           inline: true },
          { name: '🎗️ Er',             value: 'Er rütbesi için başvurur',               inline: true },
          { name: '\u200b',             value: '\u200b',                                 inline: false },
          { name: '🔘 Üst Yönetim Butonları', value: '\u200b',                          inline: false },
          { name: '✋ Üstlen',           value: 'Başvuruyu üstlenir',                   inline: true },
          { name: '🏠 Mülakat Odası',   value: 'Mülakat kanalı açar',                  inline: true },
          { name: '✅ Onayla',           value: 'Başvuruyu onaylar, Stajyer rolü verir', inline: true },
          { name: '❌ Reddet',           value: 'Başvuruyu reddeder, kanal silinir',     inline: true },
        )
        .setFooter({ text: 'JÖH Başvuru Sistemi v2.0' })
        .setTimestamp();
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (commandName === 'panel') {
      const embed = new EmbedBuilder()
        .setTitle('🪖 JÖH Rütbe Başvuru Merkezi')
        .setDescription(
          '**Jandarma Özel Harekat Birliği**\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
          '⚔️ Rütbe başvurusu yapmak için aşağıdaki butonları kullanabilirsiniz.\n\n' +
          '📋 **Başvuru Kuralları:**\n' +
          '> • Başvurular üst yönetim tarafından incelenir\n' +
          '> • Gerekli görülmesi halinde mülakat yapılacaktır\n' +
          '> • Başvuru sonucu size bildirilecektir\n' +
          '> • Birden fazla başvuru yapılamaz\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
        )
        .setColor(0x2F3136)
        .setFooter({ text: 'JÖH Başvuru Sistemi v2.0' })
        .setTimestamp();

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('basvuru_subay').setLabel('Subay Başvurusu').setStyle(ButtonStyle.Primary).setEmoji('⚔️'),
        new ButtonBuilder().setCustomId('basvuru_astsubay').setLabel('Astsubay Başvurusu').setStyle(ButtonStyle.Success).setEmoji('🛡️'),
        new ButtonBuilder().setCustomId('basvuru_uzman').setLabel('Uzman Başvurusu').setStyle(ButtonStyle.Secondary).setEmoji('🔫'),
      );
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('basvuru_cavus').setLabel('Çavuş Başvurusu').setStyle(ButtonStyle.Danger).setEmoji('🪖'),
        new ButtonBuilder().setCustomId('basvuru_er').setLabel('Er Başvurusu').setStyle(ButtonStyle.Primary).setEmoji('🎗️'),
      );

      await interaction.channel.send({ embeds: [embed], components: [row1, row2] });
      return interaction.reply({ content: '✅ Başvuru paneli kuruldu!', ephemeral: true });
    }

    if (commandName === 'rutbe-kur') {
      await interaction.deferReply({ ephemeral: true });
      await setupRoles();
      return interaction.editReply({ content: '✅ Tüm JÖH rütbeleri kontrol edildi ve oluşturuldu!' });
    }

    if (commandName === 'log-kur') {
      try { await interaction.channel.setName('basvuru-logs'); } catch {}
      return interaction.reply({ content: '✅ Bu kanal **basvuru-logs** olarak ayarlandı!', ephemeral: true });
    }
  }

  // ── BUTTONS ──
  if (interaction.isButton()) {
    const id = interaction.customId;
    if (['basvuru_subay','basvuru_astsubay','basvuru_uzman','basvuru_cavus','basvuru_er'].includes(id)) {
      await showApplicationModal(interaction, id);
    } else if (id.startsWith('ustlen_'))  { await handleClaim(interaction); }
    else if (id.startsWith('red_'))       { await handleReject(interaction); }
    else if (id.startsWith('mulakat_'))   { await handleInterview(interaction); }
    else if (id.startsWith('onay_'))      { await handleApprove(interaction); }
  }

  // ── MODALS ──
  if (interaction.isModalSubmit() && interaction.customId.startsWith('basvuru_form_')) {
    await handleApplicationSubmit(interaction);
  }
});

// ── APPLICATION FUNCTIONS ─────────────────
async function showApplicationModal(interaction, typeId) {
  const typeNames = { basvuru_subay:'Subay', basvuru_astsubay:'Astsubay', basvuru_uzman:'Uzman', basvuru_cavus:'Çavuş', basvuru_er:'Er' };
  const alreadyApplied = activeApplications.get(`${interaction.guild.id}-${interaction.user.id}`);
  if (alreadyApplied) {
    const ch = interaction.guild.channels.cache.get(alreadyApplied);
    if (ch) return interaction.reply({ content: `❌ Zaten aktif bir başvurunuz var: ${ch}`, ephemeral: true });
  }
  const modal = new ModalBuilder().setCustomId(`basvuru_form_${typeId}`).setTitle(`⚔️ ${typeNames[typeId]} Başvuru Formu`);
  modal.addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ad_soyad').setLabel('👤 Ad Soyad').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(50)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('yas').setLabel('📅 Yaş').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(3)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('tecrube').setLabel('🎖️ Discord/RP Tecrübesi').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('neden').setLabel('💬 Neden JÖH\'e Katılmak İstiyorsunuz?').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ek_bilgi').setLabel('📝 Ek Bilgi (Opsiyonel)').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(300)),
  );
  await interaction.showModal(modal);
}

async function handleApplicationSubmit(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const guild  = interaction.guild;
  const member = interaction.member;
  const typeId = interaction.customId.replace('basvuru_form_', '');
  const typeMap = {
    basvuru_subay:    { name:'Subay',    emoji:'⚔️', color:0x1E90FF },
    basvuru_astsubay: { name:'Astsubay', emoji:'🛡️', color:0x2E8B57 },
    basvuru_uzman:    { name:'Uzman',    emoji:'🔫', color:0x9370DB },
    basvuru_cavus:    { name:'Çavuş',   emoji:'🪖', color:0xFF4500 },
    basvuru_er:       { name:'Er',       emoji:'🎗️', color:0x808080 },
  };
  const type    = typeMap[typeId];
  const adSoyad = interaction.fields.getTextInputValue('ad_soyad');
  const yas     = interaction.fields.getTextInputValue('yas');
  const tecrube = interaction.fields.getTextInputValue('tecrube');
  const neden   = interaction.fields.getTextInputValue('neden');
  const ekBilgi = interaction.fields.getTextInputValue('ek_bilgi') || 'Belirtilmedi';

  let category = guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('başvuru'));
  if (!category) category = await guild.channels.create({ name: '📋 Başvurular', type: ChannelType.GuildCategory });

  const ustRol   = guild.roles.cache.get(UST_ROL_ID);
  const safeName = member.user.username.slice(0,15).toLowerCase().replace(/[^a-z0-9]/g,'');
  const appId    = `${Date.now()}-${member.id}`;

  const permOverwrites = [
    { id: guild.id,       deny: [PermissionFlagsBits.ViewChannel] },
    { id: member.id,      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] },
    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
  ];
  if (ustRol) permOverwrites.push({ id: ustRol.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });

  const channel = await guild.channels.create({
    name: `basvuru-${safeName}`,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites,
  });
  activeApplications.set(`${guild.id}-${member.id}`, channel.id);

  const embed = new EmbedBuilder()
    .setTitle(`${type.emoji} ${type.name} Rütbesi Başvurusu`)
    .setDescription(`📌 **Yeni Başvuru!**\n\n${ustRol ? `<@&${UST_ROL_ID}>` : '@Üst Yönetim'} dikkatinize!\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    .setColor(type.color)
    .addFields(
      { name:'👤 Başvuran',         value:`${member}`, inline:true },
      { name:'🎖️ Rütbe',           value:type.name,   inline:true },
      { name:'📅 Tarih',            value:`<t:${Math.floor(Date.now()/1000)}:F>`, inline:false },
      { name:'📛 Ad Soyad',         value:adSoyad,     inline:true },
      { name:'🎂 Yaş',              value:yas,         inline:true },
      { name:'🎯 Tecrübe',          value:tecrube,     inline:false },
      { name:'💬 Katılma Sebebi',   value:neden,       inline:false },
      { name:'📝 Ek Bilgi',         value:ekBilgi,     inline:false },
    )
    .setFooter({ text:`Başvuru ID: ${appId}` }).setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ustlen_${appId}_${member.id}_${typeId}`).setLabel('✋ Üstlen').setStyle(ButtonStyle.Primary).setEmoji('🙋'),
    new ButtonBuilder().setCustomId(`mulakat_${appId}_${member.id}`).setLabel('🗣️ Mülakat Odası').setStyle(ButtonStyle.Secondary).setEmoji('🏠'),
    new ButtonBuilder().setCustomId(`onay_${appId}_${member.id}_${typeId}`).setLabel('✅ Onayla').setStyle(ButtonStyle.Success).setEmoji('✅'),
    new ButtonBuilder().setCustomId(`red_${appId}_${member.id}`).setLabel('❌ Reddet').setStyle(ButtonStyle.Danger).setEmoji('❌'),
  );

  await channel.send({ content: ustRol ? `<@&${UST_ROL_ID}>` : '', embeds: [embed], components: [row] });
  await interaction.editReply({ content: `✅ Başvurunuz alındı! ${channel} kanalında incelenecek.` });

  await sendLog(guild, new EmbedBuilder().setTitle('📋 Yeni Başvuru').setColor(type.color)
    .addFields(
      { name:'👤 Başvuran', value:`${member} (${member.id})`, inline:true },
      { name:'🎖️ Rütbe',   value:type.name,                  inline:true },
      { name:'📌 Kanal',   value:`${channel}`,               inline:true },
    ).setTimestamp()
  );
}

async function handleClaim(interaction) {
  if (!interaction.member.roles.cache.has(UST_ROL_ID))
    return interaction.reply({ content:'❌ Sadece Üst Yönetim.', ephemeral:true });
  const memberId = interaction.customId.split('_')[3];
  await interaction.reply({ embeds:[new EmbedBuilder().setTitle('🙋 Üstlenildi').setDescription(`${interaction.member} başvuruyu üstlendi.\n\n<@${memberId}> başvurunuz inceleniyor.`).setColor(0x5865F2).setTimestamp()] });
  await sendLog(interaction.guild, new EmbedBuilder().setTitle('🙋 Başvuru Üstlenildi').setColor(0x5865F2)
    .addFields({ name:'📌 Kanal', value:`${interaction.channel}`, inline:true }, { name:'👮 Üstlenen', value:`${interaction.member}`, inline:true }).setTimestamp()
  );
}

async function handleInterview(interaction) {
  if (!interaction.member.roles.cache.has(UST_ROL_ID))
    return interaction.reply({ content:'❌ Sadece Üst Yönetim.', ephemeral:true });

  const memberId = interaction.customId.split('_')[2];
  const guild    = interaction.guild;
  const target   = guild.members.cache.get(memberId) || await guild.members.fetch(memberId).catch(()=>null);
  if (!target) return interaction.reply({ content:'❌ Üye bulunamadı.', ephemeral:true });

  let category = guild.channels.cache.find((c)=>c.type===ChannelType.GuildCategory&&c.name.toLowerCase().includes('mülakat'));
  if (!category) category = await guild.channels.create({ name:'🗣️ Mülakatlar', type:ChannelType.GuildCategory });

  const ustRol = guild.roles.cache.get(UST_ROL_ID);
  const perm = [
    { id:guild.id,       deny:[PermissionFlagsBits.ViewChannel] },
    { id:memberId,       allow:[PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
    { id:client.user.id, allow:[PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
  ];
  if (ustRol) perm.push({ id:ustRol.id, allow:[PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });

  const safe = target.user.username.slice(0,15).toLowerCase().replace(/[^a-z0-9]/g,'');
  const mCh  = await guild.channels.create({ name:`mulakat-${safe}`, type:ChannelType.GuildText, parent:category.id, permissionOverwrites:perm });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`onay_mulakat_${memberId}_basvuru_subay`).setLabel('✅ Onayla & Rol Ver').setStyle(ButtonStyle.Success).setEmoji('✅'),
    new ButtonBuilder().setCustomId(`red_mulakat_${memberId}`).setLabel('❌ Reddet').setStyle(ButtonStyle.Danger).setEmoji('❌'),
  );

  await mCh.send({ content:`${target}`, embeds:[new EmbedBuilder().setTitle('🗣️ Mülakat Odası').setDescription(`${target} hoş geldiniz!\n\n👔 **Mülakatçı:** ${interaction.member}\n\n📋 Kurallara uyun ve dürüst olun.`).setColor(0xFEE75C).setTimestamp()], components:[row] });
  await interaction.reply({ content:`✅ Mülakat odası: ${mCh}` });

  await sendLog(guild, new EmbedBuilder().setTitle('🗣️ Mülakat Açıldı').setColor(0xFEE75C)
    .addFields({ name:'👤 Başvuran', value:`${target}`, inline:true }, { name:'👮 Açan', value:`${interaction.member}`, inline:true }, { name:'📌 Oda', value:`${mCh}`, inline:true }).setTimestamp()
  );
}

async function handleApprove(interaction) {
  if (!interaction.member.roles.cache.has(UST_ROL_ID))
    return interaction.reply({ content:'❌ Sadece Üst Yönetim.', ephemeral:true });

  const memberId = interaction.customId.split('_')[2];
  const guild    = interaction.guild;
  const target   = guild.members.cache.get(memberId) || await guild.members.fetch(memberId).catch(()=>null);

  if (target) {
    const staj = guild.roles.cache.find((r)=>r.name==='🎓 Stajyer');
    if (staj) await target.roles.add(staj).catch(()=>{});
  }
  activeApplications.delete(`${guild.id}-${memberId}`);

  await interaction.reply({ embeds:[new EmbedBuilder().setTitle('✅ Onaylandı!').setDescription(`${target??`<@${memberId}>`} tebrikler!\n🎓 **Stajyer** rolü verildi.\n👔 **Onaylayan:** ${interaction.member}\n\n> Kanal 10 saniye içinde silinecek.`).setColor(0x57F287).setTimestamp()] });
  if (target) { try { await target.send({ embeds:[new EmbedBuilder().setTitle('🎉 Başvurunuz Onaylandı!').setDescription('JÖH\'e hoş geldiniz! 🎓 **Stajyer** rolü verildi.').setColor(0x57F287)] }); } catch {} }

  await sendLog(guild, new EmbedBuilder().setTitle('✅ Başvuru Onaylandı').setColor(0x57F287)
    .addFields({ name:'👤 Kişi', value:target?`${target} (${memberId})`:memberId, inline:true }, { name:'👮 Onaylayan', value:`${interaction.member}`, inline:true }, { name:'🎓 Rol', value:'Stajyer', inline:true }).setTimestamp()
  );
  setTimeout(()=>interaction.channel.delete('Onaylandı').catch(()=>{}), 10000);
}

async function handleReject(interaction) {
  if (!interaction.member.roles.cache.has(UST_ROL_ID))
    return interaction.reply({ content:'❌ Sadece Üst Yönetim.', ephemeral:true });

  const memberId = interaction.customId.split('_')[2];
  const guild    = interaction.guild;
  const target   = guild.members.cache.get(memberId) || await guild.members.fetch(memberId).catch(()=>null);

  activeApplications.delete(`${guild.id}-${memberId}`);
  await interaction.reply({ embeds:[new EmbedBuilder().setTitle('❌ Reddedildi').setDescription(`${target??`<@${memberId}>`} başvurunuz reddedildi.\n👔 **Reddeden:** ${interaction.member}\n\n> Kanal 10 saniye içinde silinecek.`).setColor(0xED4245).setTimestamp()] });
  if (target) { try { await target.send({ embeds:[new EmbedBuilder().setTitle('❌ Başvurunuz Reddedildi').setDescription('Başvurunuz kabul edilmedi. Daha sonra tekrar deneyebilirsiniz.').setColor(0xED4245)] }); } catch {} }

  await sendLog(guild, new EmbedBuilder().setTitle('❌ Başvuru Reddedildi').setColor(0xED4245)
    .addFields({ name:'👤 Kişi', value:target?`${target} (${memberId})`:memberId, inline:true }, { name:'👮 Reddeden', value:`${interaction.member}`, inline:true }).setTimestamp()
  );
  setTimeout(()=>interaction.channel.delete('Reddedildi').catch(()=>{}), 10000);
}

client.login(TOKEN);
