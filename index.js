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
  RoleManager,
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

const TOKEN = process.env.BASVURU_TOKEN;
const UST_YONETIM_ROLE_ID = '1505270476652413079';
const GUILD_ID = process.env.GUILD_ID;

const JOH_RUTBELER = [
  { name: '👑 Genel Başkan', color: 0xFFD700 },
  { name: '⭐ Başkan Yardımcısı', color: 0xFFA500 },
  { name: '🔰 Genel Müdür', color: 0xC0C0C0 },
  { name: '🎖️ Bölge Komutanı', color: 0x8B0000 },
  { name: '🏅 Kıdemli Subay', color: 0x4169E1 },
  { name: '⚔️ Subay', color: 0x1E90FF },
  { name: '🛡️ Kıdemli Astsubay', color: 0x2E8B57 },
  { name: '🎯 Astsubay', color: 0x32CD32 },
  { name: '🔫 Kıdemli Uzman', color: 0x9370DB },
  { name: '💪 Uzman', color: 0xBA55D3 },
  { name: '🪖 Kıdemli Çavuş', color: 0xFF6347 },
  { name: '🎗️ Çavuş', color: 0xFF4500 },
  { name: '📋 Onbaşı', color: 0xDAA520 },
  { name: '🆕 Er', color: 0x808080 },
  { name: '🎓 Stajyer', color: 0x00CED1 },
];

const activeApplications = new Map();

client.once('ready', async () => {
  console.log(`✅ Başvuru Bot aktif: ${client.user.tag}`);
  await setupRoles();
});

async function setupRoles() {
  const guild = client.guilds.cache.get(GUILD_ID);
  if (!guild) return;

  console.log('🔄 JÖH rütbeleri oluşturuluyor...');

  for (const rutbe of JOH_RUTBELER) {
    const existing = guild.roles.cache.find((r) => r.name === rutbe.name);
    if (!existing) {
      try {
        await guild.roles.create({
          name: rutbe.name,
          color: rutbe.color,
          reason: 'JÖH Başvuru Botu - Otomatik rütbe oluşturma',
        });
        console.log(`✅ Rütbe oluşturuldu: ${rutbe.name}`);
        await new Promise((r) => setTimeout(r, 500));
      } catch (e) {
        console.error(`❌ Rütbe oluşturulamadı: ${rutbe.name}`, e.message);
      }
    } else {
      console.log(`⏭️ Zaten mevcut: ${rutbe.name}`);
    }
  }

  console.log('✅ Tüm JÖH rütbeleri kontrol edildi.');
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  if (message.content === '!basvuru-panel') {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.reply('❌ Bu komutu kullanmak için yönetici yetkisi gereklidir.');
    }

    const embed = new EmbedBuilder()
      .setTitle('🪖 JÖH Rütbe Başvuru Merkezi')
      .setDescription(
        '**Jandarma Özel Harekat Birliği**\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
        '⚔️ Rütbe başvurusu yapmak için aşağıdaki butonları kullanabilirsiniz.\n\n' +
        '📋 **Başvuru Kuralları:**\n' +
        '> • Başvurular üst yönetim tarafından incelenir\n' +
        '> • Gerekli görülmesi halinde mülakat yapılacaktır\n' +
        '> • Başvuru sonucu size bildirilecektir\n' +
        '> • Birden fazla başvuru yapılamaz\n\n' +
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
      )
      .setColor(0x2F3136)
      .setImage('https://i.imgur.com/placeholder.png')
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

    await message.channel.send({ embeds: [embed], components: [row1, row2] });
    await message.delete().catch(() => {});
  }
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    const id = interaction.customId;

    if (id.startsWith('basvuru_') && !id.includes('ustlen') && !id.includes('red') && !id.includes('mulakat') && !id.includes('onay') && !id.includes('sil')) {
      await showApplicationModal(interaction, id);
    } else if (id.startsWith('ustlen_')) {
      await handleClaim(interaction);
    } else if (id.startsWith('red_')) {
      await handleReject(interaction);
    } else if (id.startsWith('mulakat_')) {
      await handleInterview(interaction);
    } else if (id.startsWith('onay_')) {
      await handleApprove(interaction);
    } else if (id.startsWith('sil_')) {
      await handleDelete(interaction);
    }
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId.startsWith('basvuru_form_')) {
      await handleApplicationSubmit(interaction);
    }
  }
});

async function showApplicationModal(interaction, typeId) {
  const typeMap = {
    basvuru_subay: 'Subay',
    basvuru_astsubay: 'Astsubay',
    basvuru_uzman: 'Uzman Erbaşı',
    basvuru_cavus: 'Çavuş',
    basvuru_er: 'Er',
  };

  const typeName = typeMap[typeId] || 'Bilinmeyen';

  const alreadyApplied = activeApplications.get(`${interaction.guild.id}-${interaction.user.id}`);
  if (alreadyApplied) {
    const ch = interaction.guild.channels.cache.get(alreadyApplied);
    if (ch) {
      return interaction.reply({
        content: `❌ Zaten aktif bir başvurunuz bulunmaktadır: ${ch}\nLütfen önce mevcut başvurunuzu bekleyiniz.`,
        ephemeral: true,
      });
    }
  }

  const modal = new ModalBuilder()
    .setCustomId(`basvuru_form_${typeId}`)
    .setTitle(`⚔️ ${typeName} Başvuru Formu`);

  const adSoyad = new TextInputBuilder()
    .setCustomId('ad_soyad')
    .setLabel('👤 Ad Soyad')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Adınızı ve soyadınızı girin')
    .setRequired(true)
    .setMaxLength(50);

  const yas = new TextInputBuilder()
    .setCustomId('yas')
    .setLabel('📅 Yaş')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Yaşınızı girin')
    .setRequired(true)
    .setMaxLength(3);

  const tecrube = new TextInputBuilder()
    .setCustomId('tecrube')
    .setLabel('🎖️ Discord/Rol Play Tecrübesi')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Daha önce hangi sunucularda görev yaptınız?')
    .setRequired(true)
    .setMaxLength(500);

  const neden = new TextInputBuilder()
    .setCustomId('neden')
    .setLabel('💬 Neden JÖH\'e Katılmak İstiyorsunuz?')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Katılma nedeninizi açıklayın')
    .setRequired(true)
    .setMaxLength(500);

  const ek_bilgi = new TextInputBuilder()
    .setCustomId('ek_bilgi')
    .setLabel('📝 Ek Bilgi (Opsiyonel)')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Eklemek istediğiniz bilgiler...')
    .setRequired(false)
    .setMaxLength(300);

  modal.addComponents(
    new ActionRowBuilder().addComponents(adSoyad),
    new ActionRowBuilder().addComponents(yas),
    new ActionRowBuilder().addComponents(tecrube),
    new ActionRowBuilder().addComponents(neden),
    new ActionRowBuilder().addComponents(ek_bilgi),
  );

  await interaction.showModal(modal);
}

async function handleApplicationSubmit(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  const member = interaction.member;
  const typeId = interaction.customId.replace('basvuru_form_', '');

  const typeMap = {
    basvuru_subay: { name: 'Subay', rutbe: '⚔️ Subay', stajyer: '🎓 Stajyer', emoji: '⚔️', color: 0x1E90FF },
    basvuru_astsubay: { name: 'Astsubay', rutbe: '🛡️ Kıdemli Astsubay', stajyer: '🎓 Stajyer', emoji: '🛡️', color: 0x2E8B57 },
    basvuru_uzman: { name: 'Uzman', rutbe: '💪 Uzman', stajyer: '🎓 Stajyer', emoji: '🔫', color: 0x9370DB },
    basvuru_cavus: { name: 'Çavuş', rutbe: '🎗️ Çavuş', stajyer: '🎓 Stajyer', emoji: '🪖', color: 0xFF4500 },
    basvuru_er: { name: 'Er', rutbe: '🆕 Er', stajyer: '🎓 Stajyer', emoji: '🎗️', color: 0x808080 },
  };

  const type = typeMap[typeId];
  const adSoyad = interaction.fields.getTextInputValue('ad_soyad');
  const yas = interaction.fields.getTextInputValue('yas');
  const tecrube = interaction.fields.getTextInputValue('tecrube');
  const neden = interaction.fields.getTextInputValue('neden');
  const ekBilgi = interaction.fields.getTextInputValue('ek_bilgi') || 'Belirtilmedi';

  let category = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('başvuru')
  );

  if (!category) {
    category = await guild.channels.create({
      name: '📋 Başvurular',
      type: ChannelType.GuildCategory,
    });
  }

  const ustYonetimRole = guild.roles.cache.get(UST_YONETIM_ROLE_ID);

  const channelName = `${type.emoji.replace(/[^a-zA-Z0-9]/g, '')}-basvuru-${member.user.username.slice(0, 15).toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  const permissionOverwrites = [
    {
      id: guild.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: member.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
      deny: [PermissionFlagsBits.SendMessages],
    },
    {
      id: client.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
    },
  ];

  if (ustYonetimRole) {
    permissionOverwrites.push({
      id: ustYonetimRole.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    });
  }

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites,
  });

  activeApplications.set(`${guild.id}-${member.id}`, channel.id);

  const appId = `${Date.now()}-${member.id}`;

  const embed = new EmbedBuilder()
    .setTitle(`${type.emoji} ${type.name} Rütbesi Başvurusu`)
    .setDescription(
      `📌 **Yeni Başvuru Alındı!**\n\n` +
      `${ustYonetimRole ? `<@&${UST_YONETIM_ROLE_ID}>` : '@Üst Yönetim'} dikkatinize!\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    )
    .setColor(type.color)
    .addFields(
      { name: '👤 Başvuran', value: `${member}`, inline: true },
      { name: '🎖️ Başvurulan Rütbe', value: type.name, inline: true },
      { name: '📅 Başvuru Tarihi', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false },
      { name: '📛 Ad Soyad', value: adSoyad, inline: true },
      { name: '🎂 Yaş', value: yas, inline: true },
      { name: '🎯 Tecrübe', value: tecrube, inline: false },
      { name: '💬 Katılma Sebebi', value: neden, inline: false },
      { name: '📝 Ek Bilgi', value: ekBilgi, inline: false },
    )
    .setFooter({ text: `Başvuru ID: ${appId}` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ustlen_${appId}_${member.id}_${typeId}`).setLabel('✋ Başvuruyu Üstlen').setStyle(ButtonStyle.Primary).setEmoji('🙋'),
    new ButtonBuilder().setCustomId(`mulakat_${appId}_${member.id}`).setLabel('🗣️ Mülakat Odası Oluştur').setStyle(ButtonStyle.Secondary).setEmoji('🏠'),
    new ButtonBuilder().setCustomId(`onay_${appId}_${member.id}_${typeId}`).setLabel('✅ Onayla').setStyle(ButtonStyle.Success).setEmoji('✅'),
    new ButtonBuilder().setCustomId(`red_${appId}_${member.id}`).setLabel('❌ Reddet').setStyle(ButtonStyle.Danger).setEmoji('❌'),
  );

  await channel.send({
    content: ustYonetimRole ? `<@&${UST_YONETIM_ROLE_ID}>` : '',
    embeds: [embed],
    components: [row],
  });

  await interaction.editReply({
    content: `✅ Başvurunuz başarıyla alındı! ${channel} kanalında incelenecektir.\n\n📋 Üst yönetim en kısa sürede başvurunuzu değerlendirecektir.`,
  });
}

async function handleClaim(interaction) {
  const ustYonetimRole = interaction.guild.roles.cache.get(UST_YONETIM_ROLE_ID);
  if (ustYonetimRole && !interaction.member.roles.cache.has(UST_YONETIM_ROLE_ID)) {
    return interaction.reply({ content: '❌ Bu butonu kullanmak için Üst Yönetim rolüne sahip olmanız gerekiyor.', ephemeral: true });
  }

  const parts = interaction.customId.split('_');
  const memberId = parts[3];

  const embed = new EmbedBuilder()
    .setTitle('🙋 Başvuru Üstlenildi')
    .setDescription(`${interaction.member} bu başvuruyu üstlendi ve incelemeye aldı.\n\n<@${memberId}> başvurunuz işleme alındı, lütfen bekleyiniz.`)
    .setColor(0x5865F2)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

async function handleInterview(interaction) {
  const ustYonetimRole = interaction.guild.roles.cache.get(UST_YONETIM_ROLE_ID);
  if (ustYonetimRole && !interaction.member.roles.cache.has(UST_YONETIM_ROLE_ID)) {
    return interaction.reply({ content: '❌ Bu butonu kullanmak için Üst Yönetim rolüne sahip olmanız gerekiyor.', ephemeral: true });
  }

  const parts = interaction.customId.split('_');
  const memberId = parts[2];

  const guild = interaction.guild;

  let category = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase().includes('mülakat')
  );

  if (!category) {
    category = await guild.channels.create({
      name: '🗣️ Mülakatlar',
      type: ChannelType.GuildCategory,
    });
  }

  const targetMember = guild.members.cache.get(memberId);
  if (!targetMember) {
    return interaction.reply({ content: '❌ Başvuran üye bulunamadı.', ephemeral: true });
  }

  const ustYonetimRoleObj = guild.roles.cache.get(UST_YONETIM_ROLE_ID);

  const permOverwrites = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: memberId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    },
    {
      id: client.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
    },
  ];

  if (ustYonetimRoleObj) {
    permOverwrites.push({
      id: ustYonetimRoleObj.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    });
  }

  const mulakatChannel = await guild.channels.create({
    name: `🗣️-mulakat-${targetMember.user.username.slice(0, 15).toLowerCase().replace(/[^a-z0-9]/g, '')}`,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: permOverwrites,
  });

  const embed = new EmbedBuilder()
    .setTitle('🗣️ Mülakat Odası Açıldı')
    .setDescription(
      `${targetMember} mülakat odanıza hoş geldiniz!\n\n` +
      `👔 **Mülakatçı:** ${interaction.member}\n\n` +
      '📋 Mülakat süresince lütfen kurallara uyun ve dürüst olun.\n' +
      '⏱️ Mülakat tamamlandığında yetkili kanalı kapatacaktır.'
    )
    .setColor(0xFEE75C)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`onay_mulakat_${memberId}_basvuru_subay`)
      .setLabel('✅ Mülakatı Onayla & Rol Ver')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅'),
    new ButtonBuilder()
      .setCustomId(`red_mulakat_${memberId}`)
      .setLabel('❌ Mülakatı Reddet')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌'),
  );

  await mulakatChannel.send({
    content: `${targetMember} ${ustYonetimRoleObj ? `<@&${UST_YONETIM_ROLE_ID}>` : ''}`,
    embeds: [embed],
    components: [row],
  });

  await interaction.reply({
    content: `✅ Mülakat odası oluşturuldu: ${mulakatChannel}\n<@${memberId}> mülakat odasına yönlendirildi.`,
  });
}

async function handleApprove(interaction) {
  const ustYonetimRole = interaction.guild.roles.cache.get(UST_YONETIM_ROLE_ID);
  if (ustYonetimRole && !interaction.member.roles.cache.has(UST_YONETIM_ROLE_ID)) {
    return interaction.reply({ content: '❌ Bu butonu kullanmak için Üst Yönetim rolüne sahip olmanız gerekiyor.', ephemeral: true });
  }

  const parts = interaction.customId.split('_');
  const memberId = parts[2];
  const guild = interaction.guild;

  const targetMember = guild.members.cache.get(memberId) || await guild.members.fetch(memberId).catch(() => null);
  if (!targetMember) {
    return interaction.reply({ content: '❌ Üye bulunamadı, sunucudan ayrılmış olabilir.', ephemeral: true });
  }

  const stajyerRole = guild.roles.cache.find((r) => r.name === '🎓 Stajyer');
  if (stajyerRole) {
    await targetMember.roles.add(stajyerRole, 'Başvuru onaylandı - Stajyer rolü verildi').catch(console.error);
  }

  activeApplications.delete(`${guild.id}-${memberId}`);

  const embed = new EmbedBuilder()
    .setTitle('✅ Başvuru Onaylandı!')
    .setDescription(
      `${targetMember} tebrikler! Başvurunuz kabul edildi.\n\n` +
      `🎓 **Stajyer** rolü verildi.\n` +
      `👔 **Onaylayan:** ${interaction.member}\n\n` +
      `> Lütfen sunucu kurallarını okuyun ve görevinizi en iyi şekilde yerine getirin!`
    )
    .setColor(0x57F287)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });

  try {
    await targetMember.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('🎉 Başvurunuz Onaylandı!')
          .setDescription(
            `JÖH sunucusuna hoş geldiniz!\n\n` +
            `🎓 **Stajyer** rolü size verildi.\n` +
            `Başarılar dileriz!`
          )
          .setColor(0x57F287)
          .setTimestamp(),
      ],
    });
  } catch (e) {
    console.log('DM gönderilemedi:', e.message);
  }

  setTimeout(async () => {
    await interaction.channel.delete('Başvuru onaylandı').catch(() => {});
  }, 10000);
}

async function handleReject(interaction) {
  const ustYonetimRole = interaction.guild.roles.cache.get(UST_YONETIM_ROLE_ID);
  if (ustYonetimRole && !interaction.member.roles.cache.has(UST_YONETIM_ROLE_ID)) {
    return interaction.reply({ content: '❌ Bu butonu kullanmak için Üst Yönetim rolüne sahip olmanız gerekiyor.', ephemeral: true });
  }

  const parts = interaction.customId.split('_');
  const memberId = parts[2];
  const guild = interaction.guild;

  const targetMember = guild.members.cache.get(memberId) || await guild.members.fetch(memberId).catch(() => null);

  activeApplications.delete(`${guild.id}-${memberId}`);

  const embed = new EmbedBuilder()
    .setTitle('❌ Başvuru Reddedildi')
    .setDescription(
      `${targetMember ? targetMember : `<@${memberId}>`} başvurunuz reddedildi.\n\n` +
      `👔 **Reddeden:** ${interaction.member}\n\n` +
      `> Kanal 10 saniye içinde silinecektir.`
    )
    .setColor(0xED4245)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });

  if (targetMember) {
    try {
      await targetMember.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('❌ Başvurunuz Reddedildi')
            .setDescription('Üzgünüz, başvurunuz bu sefer kabul edilmedi.\nDaha sonra tekrar başvurabilirsiniz.')
            .setColor(0xED4245)
            .setTimestamp(),
        ],
      });
    } catch (e) {
      console.log('DM gönderilemedi:', e.message);
    }
  }

  setTimeout(async () => {
    await interaction.channel.delete('Başvuru reddedildi').catch(() => {});
  }, 10000);
}

async function handleDelete(interaction) {
  const ustYonetimRole = interaction.guild.roles.cache.get(UST_YONETIM_ROLE_ID);
  if (ustYonetimRole && !interaction.member.roles.cache.has(UST_YONETIM_ROLE_ID)) {
    return interaction.reply({ content: '❌ Yetkiniz yok.', ephemeral: true });
  }
  await interaction.channel.delete('Manuel silindi').catch(() => {});
}

client.login(TOKEN);
