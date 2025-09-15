# Discord Ticket Bot

A professional Discord ticket support system with multiple categories and comprehensive management features.

## Features

- **Multiple Ticket Categories**
  - 📋 General Help
  - 🐛 Bug Report
  - 👤 Player Report
  - 🖥️ Server Help

- **Ticket Management**
  - Automatic ticket numbering (format: `[category]-[0001]`)
  - Team role ping on ticket creation
  - Add/remove users from tickets
  - Rename tickets
  - Generate ticket transcripts
  - Claim tickets (for team members)
  - Priority levels

- **Professional Interface**
  - Clean embeds with custom theming (#f69f7e)
  - Gray buttons on main panel
  - Intuitive controls and settings

## Setup Instructions

### 1. Create Discord Application & Bot

1. Go to https://discord.com/developers/applications
2. Click "New Application" and give it a name
3. Go to the "Bot" section in the left sidebar
4. Click "Add Bot"
5. Copy the bot token (you'll need this)
6. Under "Privileged Gateway Intents", enable:
   - Server Members Intent
   - Message Content Intent

### 2. Configure the Bot

1. Open the `.env` file
2. Replace `YOUR_BOT_TOKEN_HERE` with your actual bot token
3. The team role ID is already set to: `1375494343078580305`

### 3. Install & Run

```bash
# Install dependencies
npm install

# Start the bot
npm start
```

### 4. Invite Bot to Server

1. In Discord Developer Portal, go to OAuth2 → URL Generator
2. Select these scopes:
   - `bot`
   - `applications.commands`
3. Select these bot permissions:
   - View Channels
   - Send Messages
   - Embed Links
   - Attach Files
   - Read Message History
   - Manage Channels
   - Manage Messages
   - Use Slash Commands
4. Copy the generated URL and open it to invite the bot

### 5. Setup Ticket System

1. Run `/ticket-setup` in the channel where you want the ticket panel
2. The ticket panel will appear with 4 category buttons
3. Users can click buttons to create tickets

## Commands

| Command | Description | Permissions |
|---------|-------------|-------------|
| `/ticket-setup` | Create ticket panel | Administrator |
| `/ticket-add <user>` | Add user to ticket | All |
| `/ticket-remove <user>` | Remove user from ticket | All |
| `/ticket-close [reason]` | Close current ticket | All |
| `/ticket-rename <name>` | Rename ticket channel | All |
| `/ticket-transcript` | Generate ticket transcript | All |

## Ticket Workflow

1. **User creates ticket** → Clicks category button
2. **Ticket channel created** → Named as `[category]-[number]`
3. **Team notified** → Team role is pinged
4. **Support provided** → Team members can claim and manage ticket
5. **Ticket closed** → Channel deleted after 5 seconds

## File Structure

```
MinesetBot/
├── index.js          # Main bot file
├── package.json      # Dependencies
├── .env             # Bot token (keep secret!)
├── .gitignore       # Git ignore file
├── ticketData.json  # Ticket data storage (auto-created)
└── README.md        # This file
```

## Important Notes

- Keep your bot token secret - never share it
- The bot automatically saves ticket data to `ticketData.json`
- Ticket numbers persist across bot restarts
- Each user can only have one open ticket at a time
- Closed ticket channels are deleted after 5 seconds

## Troubleshooting

- **Bot not responding**: Check bot token in `.env`
- **Missing permissions**: Ensure bot has all required permissions
- **Commands not showing**: Wait a few minutes for Discord to register them
- **Team not pinged**: Verify the team role ID is correct

## Support

For issues or questions about this bot, please check the code or modify as needed.