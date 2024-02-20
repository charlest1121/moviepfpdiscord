# Discord Video-to-GIF Profile Updater

This Node.js script converts videos into GIFs and automatically updates a Discord self-bot's profile picture or banner with these GIFs. It supports batch processing of videos and can handle rate limits when updating the Discord profile.

## Disclaimer

Use of self-bots violates Discord's Terms of Service. Using this script with your Discord account could lead to suspension or termination. This guide is for educational purposes only. Proceed at your own risk.

## Prerequisites

- **Node.js (v16 or higher)**: Required to run the script.
- **ffmpeg**: Required for processing video files into GIFs.
- **A Discord account**: For the self-bot operation.

## Setup

### Clone the Repository

Start by cloning this repository to your local machine:

```bash
git clone https://github.com/yourusername/discord-video-to-gif-updater.git
cd discord-video-to-gif-updater
```

### Install Dependencies

Within the project directory, install the necessary npm packages:

```bash
npm install
```

### Environment Configuration

Create a `.env` file in the project root to store your Discord token securely:

```
echo "DISCORD_TOKEN=your_discord_token_here" > .env
```

Ensure the script reads this token by including `require("dotenv").config();` at the beginning of your script.

## Usage

1. **Prepare Video Files**: Place your video files in the `video` folder. The script supports `.mp4` and `.mkv` formats.

2. **Run the Script**: Execute the script to start processing video files and updating your Discord profile:

```bash
node moviepfp.js
```

The script will automatically convert videos to GIFs, store them in the `gifs` folder, and update your Discord profile picture or banner based on the `togglePfpVsBanner` variable.

## Customization

- **Profile vs. Banner**: Change `togglePfpVsBanner` to `true` for profile pictures or `false` for banners.
- **GIF Dimensions**: Adjust `gifWidth` and `gifHeight` to set the GIF size. For banners, the script calculates the aspect ratio.
- **Segment Duration and FPS**: Customize `segmentDuration` and `fps` to control the GIF's length and frame rate.

## Contributing

Contributions are welcome! If you have improvements or bug fixes, please fork the repository and submit a pull request.

## License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.