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

// ── YAPILANDIRMA ───────────────────────────
const TOKEN      = process.env.BASVURU_TOKEN;
const GUILD_ID   = process.env.GUILD_ID;
const CLIENT_ID  = '1505286602505719848';
const UST_ROL_ID = '1505270476652413079'; // Üst yönetim rolü

if (!TOKEN)    { console.error('❌ BASVURU_TOKEN env var eksik!'); process.exit(1); }
if (!GUILD_ID) { console.error('❌ GUILD_ID env var eksik!');      process.exit(1); }

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

// Bellekte başvuru verileri
const activeApps = new Map(); // key: guildId-userId, val: channelId

// ── JÖH RÜTBELER ──────────────────────────
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

// ── SLASH KOMUTLAR ─────────────────────────
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
    .setName('basvuru-listesi')
    .setDescription('📋 Aktif başvuruları listeler')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('basvuru-sil')
    .setDescription('🗑️ Bir kullanıcının başvurusunu iptal eder')
    .addUserOption((o) => o.setName('kullanici').setDescription('Başvurusu iptal edilecek kişi').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  new SlashCommandBuilder()
    .setName('durum')
    .setDescription('📊 Botun durumunu gösterir'),

  new SlashCommandBuilder()
    .setName('yardim')
    .setDescription('📖 Tüm komutları listeler'),
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

// ── YARDIMCI FONKSİYONLAR ─────────────────
async function sendLog(guild, embed) {
  try {
    const ch = guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildText &&
        (c.name.toLowerCase().includes('basvuru-log') || c.name.toLowerCase().includes('başvuru-log'))
    );
    if (ch) await ch.send({ embeds: [embed] });
  } catch {}
}

function isUstYonetim(member) {
  return member.roles.cache.has(UST_ROL_ID) || member.permissions.has(PermissionFlagsBits.Administrator);
}

function uptimeStr() {
  const u = process.uptime();
  return `${Math.floor(u / 3600)}sa ${Math.floor((u % 3600) / 60)}dk ${Math.floor(u % 60)}sn`;
}

// ── READY ──────────────────────────────────
client.once('ready', async () => {
  console.log(`✅ Başvuru Bot aktif: ${client.user.tag}`);
  console.log(`✅ ${client.guilds.cache.size} sunucuda aktif`);
  await setupRoles();
  setupWatchdog(client, TOKEN, GUILD_ID);
});

async function setupRoles() {
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return;
  let created = 0;
  for (const rutbe of JOH_RUTBELER) {
    if (!guild.roles.cache.find((r) => r.name === rutbe.name)) {
      try {
        await guild.roles.create({ name: rutbe.name, color: rutbe.color, reason: 'JÖH Bot Kurulum' });
        created++;
        await new Promise((r) => setTimeout(r, 300));
      } catch {}
    }
  }
  console.log(`✅ Rütbe kurulumu: ${created} yeni rütbe oluşturuldu.`);
}

// ── INTERACTION HANDLER ────────────────────
client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) await handleCommand(interaction);
    else if (interaction.isButton())       await handleButton(interaction);
    else if (interaction.isModalSubmit())  await handleModal(interaction);
  } catch (err) {
    console.error('[HATA]', err);
    const msg = { content: '❌ Bir hata oluştu. Lütfen tekrar deneyin.', ephemeral: true };
    if (interaction.deferred) await interaction.editReply(msg).catch(() => {});
    else if (!interaction.replied) await interaction.reply(msg).catch(() => {});
  }
});

// ── KOMUT İŞLEYİCİ ────────────────────────
async function handleCommand(interaction) {
  const { commandName, guild, member, channel } = interaction;

  // ── /durum ──
  if (commandName === 'durum') {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle('📊 Başvuru Bot — Durum').setColor(0x57F287)
        .addFields(
          { name: '🏓 Ping',              value: `${client.ws.ping}ms`,           inline: true },
          { name: '⏱️ Uptime',            value: uptimeStr(),                      inline: true },
          { name: '📋 Aktif Başvurular',  value: `${activeApps.size}`,            inline: true },
          { name: '🤖 Bot',               value: client.user.tag,                  inline: true },
          { name: '📡 Sunucu',            value: `${client.guilds.cache.size}`,   inline: true },
          { name: '💚 Durum',              value: '🟢 Online',                     inline: true },
        )
        .setFooter({ text: 'JÖH Başvuru v2.0 | Watchdog 🛡️' }).setTimestamp()],
      ephemeral: true,
    });
  }

  // ── /yardim ──
  if (commandName === 'yardim') {
    return interaction.reply({
      embeds: [new EmbedBuilder()
        .setTitle('🪖 JÖH Başvuru Bot — Komut Listesi').setColor(0x2F3136)
        .addFields(
          { name: '⚙️ Admin',            value: '\u200b' },
          { name: '/panel',         value: 'Başvuru panelini kurar',              inline: true },
          { name: '/rutbe-kur',     value: 'JÖH rütbelerini oluşturur',          inline: true },
          { name: '/log-kur',       value: 'Log kanalı ayarlar',                 inline: true },
          { name: '/basvuru-listesi', value: 'Aktif başvuruları listeler',       inline: true },
          { name: '/basvuru-sil',   value: 'Başvuruyu iptal eder',              inline: true },
          { name: '👤 Genel',            value: '\u200b' },
          { name: '/durum',         value: 'Bot durumunu gösterir',              inline: true },
          { name: '/yardim',        value: 'Bu menü',                            inline: true },
          { name: '🖱️ Panel Butonları',  value: '\u200b' },
          { name: '⚔️ Subay / 🛡️ Astsubay', value: 'Rütbe başvuruları',         inline: true },
          { name: '🔫 Uzman / 🪖 Çavuş / 🎗️ Er', value: 'Rütbe başvuruları',   inline: true },
          { name: '🔘 Üst Yönetim Butonları', value: '\u200b' },
          { name: '✋ Üstlen / 🗣️ Mülakat / ✅ Onayla / ❌ Reddet', value: 'Başvuru aksiyonları', inline: false },
        )
        .setFooter({ text: 'JÖH Başvuru Sistemi v2.0' }).setTimestamp()],
      ephemeral: true,
    });
  }

  // ── /panel ──
  if (commandName === 'panel') {
    const embed = new EmbedBuilder()
      .setTitle('🪖 JÖH Rütbe Başvuru Merkezi')
      .setDescription(
        '**Jandarma Özel Harekat Birliği**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        '⚔️ Rütbe başvurusu için aşağıdaki butonları kullanın.\n\n' +
        '📋 **Kurallar:**\n' +
        '> • Başvurular üst yönetim tarafından incelenir\n' +
        '> • Gerekirse mülakat yapılacaktır\n' +
        '> • Sonuç size bildirilecek\n' +
        '> • Birden fazla başvuru yapılamaz\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      )
      .setColor(0x2F3136)
      .setFooter({ text: 'JÖH Başvuru Sistemi v2.0' })
      .setTimestamp();

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('bsv_subay').setLabel('Subay Başvurusu').setStyle(ButtonStyle.Primary).setEmoji('⚔️'),
      new ButtonBuilder().setCustomId('bsv_astsubay').setLabel('Astsubay Başvurusu').setStyle(ButtonStyle.Success).setEmoji('🛡️'),
      new ButtonBuilder().setCustomId('bsv_uzman').setLabel('Uzman Başvurusu').setStyle(ButtonStyle.Secondary).setEmoji('🔫'),
    );
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('bsv_cavus').setLabel('Çavuş Başvurusu').setStyle(ButtonStyle.Danger).setEmoji('🪖'),
      new ButtonBuilder().setCustomId('bsv_er').setLabel('Er Başvurusu').setStyle(ButtonStyle.Primary).setEmoji('🎗️'),
    );

    await channel.send({ embeds: [embed], components: [row1, row2] });
    return interaction.reply({ content: '✅ Başvuru paneli kuruldu!', ephemeral: true });
  }

  // ── /rutbe-kur ──
  if (commandName === 'rutbe-kur') {
    await interaction.deferReply({ ephemeral: true });
    await setupRoles();
    return interaction.editReply({ content: '✅ Tüm JÖH rütbeleri kontrol edildi ve güncellendi!' });
  }

  // ── /log-kur ──
  if (commandName === 'log-kur') {
    try { await channel.setName('basvuru-logs'); } catch {}
    return interaction.reply({ content: `✅ ${channel} artık **başvuru log** kanalı!`, ephemeral: true });
  }

  // ── /basvuru-listesi ──
  if (commandName === 'basvuru-listesi') {
    if (activeApps.size === 0) {
      return interaction.reply({ content: '✅ Şu an aktif başvuru bulunmuyor.', ephemeral: true });
    }
    const embed = new EmbedBuilder()
      .setTitle(`📋 Aktif Başvurular (${activeApps.size})`).setColor(0x5865F2).setTimestamp();
    for (const [key, chId] of activeApps.entries()) {
      const userId = key.split('-')[1];
      const ch     = guild.channels.cache.get(chId);
      embed.addFields({ name: `<@${userId}>`, value: ch ? `${ch}` : `Kanal: ${chId}`, inline: true });
    }
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // ── /basvuru-sil ──
  if (commandName === 'basvuru-sil') {
    const target  = interaction.options.getMember('kullanici');
    const appKey  = `${guild.id}-${target.id}`;
    const chId    = activeApps.get(appKey);

    if (!chId) return interaction.reply({ content: '❌ Bu kullanıcının aktif başvurusu bulunamadı.', ephemeral: true });

    const appCh = guild.channels.cache.get(chId);
    activeApps.delete(appKey);
    if (appCh) await appCh.delete('Admin tarafından iptal edildi').catch(() => {});

    return interaction.reply({ content: `✅ ${target} kullanıcısının başvurusu iptal edildi.`, ephemeral: true });
  }
}

// ── BUTON İŞLEYİCİ ────────────────────────
async function handleButton(interaction) {
  const id = interaction.customId;
  const basvuruTypes = ['bsv_subay', 'bsv_astsubay', 'bsv_uzman', 'bsv_cavus', 'bsv_er'];

  if (basvuruTypes.includes(id))    await showModal(interaction, id);
  else if (id.startsWith('ustlen_')) await handleClaim(interaction);
  else if (id.startsWith('mulakat_'))await handleInterview(interaction);
  else if (id.startsWith('onay_'))   await handleApprove(interaction);
  else if (id.startsWith('red_'))    await handleReject(interaction);
}

// ── MODAL İŞLEYİCİ ────────────────────────
async function handleModal(interaction) {
  if (interaction.customId.startsWith('bsv_form_')) {
    await handleAppSubmit(interaction);
  }
}

// ── MODAL GÖSTER ───────────────────────────
async function showModal(interaction, typeId) {
  const typeNames = {
    bsv_subay: 'Subay', bsv_astsubay: 'Astsubay',
    bsv_uzman: 'Uzman', bsv_cavus: 'Çavuş', bsv_er: 'Er',
  };

  // Aktif başvuru kontrolü
  const existing = activeApps.get(`${interaction.guild.id}-${interaction.user.id}`);
  if (existing) {
    const ch = interaction.guild.channels.cache.get(existing);
    if (ch) return interaction.reply({ content: `❌ Zaten aktif bir başvurunuz var: ${ch}`, ephemeral: true });
    activeApps.delete(`${interaction.guild.id}-${interaction.user.id}`);
  }

  const modal = new ModalBuilder()
    .setCustomId(`bsv_form_${typeId}`)
    .setTitle(`⚔️ ${typeNames[typeId]} Başvuru Formu`);

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('ad_soyad').setLabel('👤 Ad Soyad').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(50)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('yas').setLabel('📅 Yaş').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(3)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('tecrube').setLabel('🎖️ Discord / RP Tecrübesi').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('neden').setLabel('💬 Neden JÖH\'e Katılmak İstiyorsunuz?').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500)
    ),
    new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('ek_bilgi').setLabel('📝 Ek Bilgi (Opsiyonel)').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(300)
    ),
  );

  await interaction.showModal(modal);
}

// ── BAŞVURU GÖNDER ─────────────────────────
async function handleAppSubmit(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const { guild, member } = interaction;
  const typeId = interaction.customId.replace('bsv_form_', '');
  const typeMap = {
    bsv_subay:    { name: 'Subay',    emoji: '⚔️', color: 0x1E90FF },
    bsv_astsubay: { name: 'Astsubay', emoji: '🛡️', color: 0x2E8B57 },
    bsv_uzman:    { name: 'Uzman',    emoji: '🔫', color: 0x9370DB },
    bsv_cavus:    { name: 'Çavuş',   emoji: '🪖', color: 0xFF4500 },
    bsv_er:       { name: 'Er',       emoji: '🎗️', color: 0x808080 },
  };
  const type = typeMap[typeId];

  const adSoyad = interaction.fields.getTextInputValue('ad_soyad');
  const yas     = interaction.fields.getTextInputValue('yas');
  const tecrube = interaction.fields.getTextInputValue('tecrube');
  const neden   = interaction.fields.getTextInputValue('neden');
  const ekBilgi = interaction.fields.getTextInputValue('ek_bilgi') || 'Belirtilmedi';
  const appId   = `${Date.now()}`;

  // Kategori bul/oluştur
  let cat = guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('başvuru'));
  if (!cat) cat = await guild.channels.create({ name: '📋 Başvurular', type: ChannelType.GuildCategory });

  const ustRol   = guild.roles.cache.get(UST_ROL_ID);
  const safeName = member.user.username.slice(0, 15).toLowerCase().replace(/[^a-z0-9]/g, '');

  const perms = [
    { id: guild.id,       deny:  [PermissionFlagsBits.ViewChannel] },
    { id: member.id,      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] },
    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.EmbedLinks] },
  ];
  if (ustRol) perms.push({ id: ustRol.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });

  const ch = await guild.channels.create({
    name: `bsv-${safeName}`,
    type: ChannelType.GuildText,
    parent: cat.id,
    permissionOverwrites: perms,
  });

  activeApps.set(`${guild.id}-${member.id}`, ch.id);

  const embed = new EmbedBuilder()
    .setTitle(`${type.emoji} ${type.name} Rütbesi Başvurusu`)
    .setDescription(
      `📌 **Yeni Başvuru!**\n${ustRol ? `<@&${UST_ROL_ID}>` : '@Üst Yönetim'} dikkatinize!\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    )
    .setColor(type.color)
    .addFields(
      { name: '👤 Başvuran',       value: `${member}`,                              inline: true },
      { name: '🎖️ Rütbe',         value: type.name,                                inline: true },
      { name: '📅 Tarih',          value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
      { name: '📛 Ad Soyad',       value: adSoyad,                                  inline: true },
      { name: '🎂 Yaş',            value: yas,                                       inline: true },
      { name: '🎯 Tecrübe',        value: tecrube,                                  inline: false },
      { name: '💬 Katılma Sebebi', value: neden,                                    inline: false },
      { name: '📝 Ek Bilgi',       value: ekBilgi,                                  inline: false },
    )
    .setFooter({ text: `Başvuru ID: ${appId} | ${member.id}` })
    .setTimestamp();

  // customId'lere sadece appId ve memberId koy, typeId'yi ayrı sakla
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ustlen_${appId}_${member.id}`).setLabel('✋ Üstlen').setStyle(ButtonStyle.Primary).setEmoji('🙋'),
    new ButtonBuilder().setCustomId(`mulakat_${appId}_${member.id}`).setLabel('🗣️ Mülakat').setStyle(ButtonStyle.Secondary).setEmoji('🏠'),
    new ButtonBuilder().setCustomId(`onay_${appId}_${member.id}`).setLabel('✅ Onayla').setStyle(ButtonStyle.Success).setEmoji('✅'),
    new ButtonBuilder().setCustomId(`red_${appId}_${member.id}`).setLabel('❌ Reddet').setStyle(ButtonStyle.Danger).setEmoji('❌'),
  );

  await ch.send({ content: ustRol ? `<@&${UST_ROL_ID}>` : '', embeds: [embed], components: [row] });
  await interaction.editReply({ content: `✅ Başvurunuz alındı! ${ch} kanalında incelenecek.` });

  await sendLog(guild, new EmbedBuilder()
    .setTitle('📋 Yeni Başvuru').setColor(type.color)
    .addFields(
      { name: '👤 Başvuran', value: `${member} (${member.id})`, inline: true },
      { name: '🎖️ Rütbe',   value: type.name,                  inline: true },
      { name: '📌 Kanal',   value: `${ch}`,                    inline: true },
    ).setTimestamp()
  );
}

// ── ÜSTLEN ─────────────────────────────────
async function handleClaim(interaction) {
  if (!isUstYonetim(interaction.member)) {
    return interaction.reply({ content: '❌ Bu işlem için Üst Yönetim rolü gerekli.', ephemeral: true });
  }
  // customId: ustlen_<appId>_<memberId>
  const parts    = interaction.customId.split('_');
  const memberId = parts[2]; // index 2 = memberId

  await interaction.reply({
    embeds: [new EmbedBuilder()
      .setTitle('🙋 Başvuru Üstlenildi')
      .setDescription(`${interaction.member} bu başvuruyu üstlendi.\n\n<@${memberId}> başvurunuz inceleniyor.`)
      .setColor(0x5865F2).setTimestamp()],
  });

  await sendLog(interaction.guild, new EmbedBuilder()
    .setTitle('🙋 Başvuru Üstlenildi').setColor(0x5865F2)
    .addFields(
      { name: '📌 Kanal',    value: `${interaction.channel}`, inline: true },
      { name: '👮 Üstlenen', value: `${interaction.member}`,  inline: true },
      { name: '👤 Başvuran', value: `<@${memberId}>`,         inline: true },
    ).setTimestamp()
  );
}

// ── MÜLAKAT ODASI ───────────────────────────
async function handleInterview(interaction) {
  if (!isUstYonetim(interaction.member)) {
    return interaction.reply({ content: '❌ Bu işlem için Üst Yönetim rolü gerekli.', ephemeral: true });
  }
  // customId: mulakat_<appId>_<memberId>
  const parts    = interaction.customId.split('_');
  const memberId = parts[2]; // index 2 = memberId

  const guild  = interaction.guild;
  const target = guild.members.cache.get(memberId) || await guild.members.fetch(memberId).catch(() => null);
  if (!target) return interaction.reply({ content: '❌ Üye bulunamadı.', ephemeral: true });

  await interaction.deferReply();

  let cat = guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('mülakat'));
  if (!cat) cat = await guild.channels.create({ name: '🗣️ Mülakatlar', type: ChannelType.GuildCategory });

  const ustRol = guild.roles.cache.get(UST_ROL_ID);
  const perms  = [
    { id: guild.id,       deny:  [PermissionFlagsBits.ViewChannel] },
    { id: target.id,      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.EmbedLinks] },
  ];
  if (ustRol) perms.push({ id: ustRol.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });

  const safe = target.user.username.slice(0, 15).toLowerCase().replace(/[^a-z0-9]/g, '');
  const mCh  = await guild.channels.create({
    name: `mulakat-${safe}`,
    type: ChannelType.GuildText,
    parent: cat.id,
    permissionOverwrites: perms,
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`onay_mul_${target.id}`).setLabel('✅ Onayla & Rol Ver').setStyle(ButtonStyle.Success).setEmoji('✅'),
    new ButtonBuilder().setCustomId(`red_mul_${target.id}`).setLabel('❌ Reddet').setStyle(ButtonStyle.Danger).setEmoji('❌'),
  );

  await mCh.send({
    content: `${target}`,
    embeds: [new EmbedBuilder()
      .setTitle('🗣️ Mülakat Odası')
      .setDescription(`${target} hoş geldiniz!\n\n👔 **Mülakatçı:** ${interaction.member}\n\n📋 Lütfen kurallara uyun ve dürüst olun.`)
      .setColor(0xFEE75C).setTimestamp()],
    components: [row],
  });

  await interaction.editReply({ content: `✅ Mülakat odası açıldı: ${mCh}` });

  await sendLog(guild, new EmbedBuilder()
    .setTitle('🗣️ Mülakat Açıldı').setColor(0xFEE75C)
    .addFields(
      { name: '👤 Başvuran', value: `${target}`,              inline: true },
      { name: '👮 Açan',    value: `${interaction.member}`,   inline: true },
      { name: '📌 Oda',     value: `${mCh}`,                  inline: true },
    ).setTimestamp()
  );
}

// ── ONAYLA ─────────────────────────────────
async function handleApprove(interaction) {
  if (!isUstYonetim(interaction.member)) {
    return interaction.reply({ content: '❌ Bu işlem için Üst Yönetim rolü gerekli.', ephemeral: true });
  }
  // customId: onay_<appId>_<memberId>  VEYA  onay_mul_<memberId>
  const parts    = interaction.customId.split('_');
  const memberId = parts[1] === 'mul' ? parts[2] : parts[2];

  const guild  = interaction.guild;
  const target = guild.members.cache.get(memberId) || await guild.members.fetch(memberId).catch(() => null);

  if (target) {
    const staj = guild.roles.cache.find((r) => r.name === '🎓 Stajyer');
    if (staj) await target.roles.add(staj).catch(() => {});
  }

  activeApps.delete(`${guild.id}-${memberId}`);

  await interaction.reply({
    embeds: [new EmbedBuilder()
      .setTitle('✅ Başvuru Onaylandı!')
      .setDescription(
        `${target ?? `<@${memberId}>`} tebrikler! 🎉\n` +
        `🎓 **Stajyer** rolü verildi.\n👔 **Onaylayan:** ${interaction.member}\n\n` +
        '> Kanal 10 saniye içinde silinecek.'
      )
      .setColor(0x57F287).setTimestamp()],
  });

  if (target) {
    target.send({ embeds: [new EmbedBuilder().setTitle('🎉 Başvurunuz Onaylandı!').setDescription('JÖH\'e hoş geldiniz! 🎓 **Stajyer** rolü verildi.').setColor(0x57F287)] }).catch(() => {});
  }

  await sendLog(guild, new EmbedBuilder()
    .setTitle('✅ Başvuru Onaylandı').setColor(0x57F287)
    .addFields(
      { name: '👤 Kişi',       value: target ? `${target} (${memberId})` : memberId, inline: true },
      { name: '👮 Onaylayan',  value: `${interaction.member}`,                        inline: true },
      { name: '🎓 Rol',        value: 'Stajyer',                                     inline: true },
    ).setTimestamp()
  );

  setTimeout(() => interaction.channel.delete('Onaylandı').catch(() => {}), 10000);
}

// ── REDDET ─────────────────────────────────
async function handleReject(interaction) {
  if (!isUstYonetim(interaction.member)) {
    return interaction.reply({ content: '❌ Bu işlem için Üst Yönetim rolü gerekli.', ephemeral: true });
  }
  // customId: red_<appId>_<memberId>  VEYA  red_mul_<memberId>
  const parts    = interaction.customId.split('_');
  const memberId = parts[1] === 'mul' ? parts[2] : parts[2];

  const guild  = interaction.guild;
  const target = guild.members.cache.get(memberId) || await guild.members.fetch(memberId).catch(() => null);

  activeApps.delete(`${guild.id}-${memberId}`);

  await interaction.reply({
    embeds: [new EmbedBuilder()
      .setTitle('❌ Başvuru Reddedildi')
      .setDescription(
        `${target ?? `<@${memberId}>`} başvurunuz reddedildi.\n` +
        `👔 **Reddeden:** ${interaction.member}\n\n> Kanal 10 saniye içinde silinecek.`
      )
      .setColor(0xED4245).setTimestamp()],
  });

  if (target) {
    target.send({ embeds: [new EmbedBuilder().setTitle('❌ Başvurunuz Reddedildi').setDescription('Başvurunuz kabul edilmedi. Daha sonra tekrar başvurabilirsiniz.').setColor(0xED4245)] }).catch(() => {});
  }

  await sendLog(guild, new EmbedBuilder()
    .setTitle('❌ Başvuru Reddedildi').setColor(0xED4245)
    .addFields(
      { name: '👤 Kişi',      value: target ? `${target} (${memberId})` : memberId, inline: true },
      { name: '👮 Reddeden', value: `${interaction.member}`,                         inline: true },
    ).setTimestamp()
  );

  setTimeout(() => interaction.channel.delete('Reddedildi').catch(() => {}), 10000);
}

// ── BAŞLAT ─────────────────────────────────
console.log('🚀 Başvuru Bot başlatılıyor...');
console.log(`📋 CLIENT_ID : ${CLIENT_ID}`);
console.log(`📋 GUILD_ID  : ${GUILD_ID}`);
console.log(`📋 TOKEN     : ${TOKEN.slice(0, 20)}...`);

registerCommands().then(() => {
  client.login(TOKEN).catch((err) => {
    console.error('❌ Login hatası:', err.message);
    process.exit(1);
  });
});
