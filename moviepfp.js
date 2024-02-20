const fs = require("fs");
require("dotenv").config();
const { Client } = require("discord.js-selfbot-v13");
const { exec } = require("child_process");
const path = require("path");
const util = require("util");
const execProm = util.promisify(require("child_process").exec);

const client = new Client();
const videosDir = "./video";
const gifsDir = "./gifs";

const shouldChangeNickname = true;
const togglePfpVsBanner = true; // true is pfp, false is banner

const gifWidth = 60;
const gifHeight = 60;
const segmentDuration = 220;
const fps = 5;

const processingQueue = [];
let isProcessing = false;

if (!fs.existsSync(gifsDir)) {
  fs.mkdirSync(gifsDir, { recursive: true });
}

client.on("ready", () => {
  console.log(`${client.user.username} is ready!`);
  processNextVideo();
});

async function processNextVideo() {
  const videoFiles = getVideoFiles(videosDir);
  if (videoFiles.length === 0) {
    console.log("No video files found to process.");
    return;
  }

  for (const videoPath of videoFiles) {
    const outputDir = path.join(
      gifsDir,
      path.basename(videoPath, path.extname(videoPath))
    );
    if (!areGifsPresent(outputDir)) {
      const videoDuration = await getVideoDuration(videoPath);
      if (videoDuration !== null) {
        const numberOfGifs = Math.ceil(videoDuration / segmentDuration);
        addToQueue(videoPath, outputDir, numberOfGifs);
      }
    } else {
      console.log(
        `GIFs for ${path.basename(videoPath)} already exist. Skipping.`
      );
    }
  }

  processQueue();
}

function addToQueue(videoPath, outputDir, totalSegments) {
  // Initially queue the first segment for processing
  processingQueue.push({
    videoPath,
    outputDir,
    segmentIndex: 0,
    totalSegments: totalSegments,
  });
}

async function processQueue() {
  if (processingQueue.length === 0) {
    console.log("Queue is empty, no more tasks to process.");
    return;
  }
  if (!isProcessing) {
    isProcessing = true;
    const task = processingQueue.shift();
    console.log(`Processing task for video: ${task.videoPath}`);
    await processVideoSegment(
      task.videoPath,
      task.outputDir,
      task.segmentIndex,
      task.totalSegments
    );
  }
}

async function getVideoDuration(videoPath) {
  try {
    const { stdout } = await execProm(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
    );
    return Math.floor(parseFloat(stdout.trim()));
  } catch (error) {
    console.error(`Error getting video duration for ${videoPath}: ${error}`);
    return null;
  }
}

async function processVideoSegment(
  videoPath,
  outputDir,
  segmentIndex,
  totalSegments
) {
  console.log(
    `Starting processVideoSegment for ${videoPath}, segment ${
      segmentIndex + 1
    } of ${totalSegments}`
  );
  const videoName = path.basename(videoPath, path.extname(videoPath));
  const outputFile = path.join(
    outputDir,
    `${videoName}_part${segmentIndex + 1}.gif`
  );

  // Ensure the output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created directory: ${outputDir}`);
  }

  if (!fs.existsSync(outputFile)) {
    const startTime = segmentDuration * segmentIndex;
    let scaleCommand = `scale=${gifWidth}:${gifHeight}:flags=lanczos`;

    // Adjust scale for banner with an aspect ratio of 16:9
    if (!togglePfpVsBanner) {
      const aspectRatio = 9 / 16;
      const qualityMultiplier = 4;
      scaleCommand = `scale=${Math.floor(
        gifWidth * qualityMultiplier
      )}:${Math.floor(
        gifWidth * qualityMultiplier * aspectRatio
      )}:flags=lanczos`;
    }

    const ffmpegCommand = `ffmpeg -ss ${startTime} -t ${segmentDuration} -i "${videoPath}" -vf "fps=${Math.floor(
      fps
    )},${scaleCommand}" -c:v gif "${outputFile}"`;
    console.log(`Executing command: ${ffmpegCommand}`);

    try {
      await execProm(ffmpegCommand);
      console.log(`GIF created at ${outputFile}`);
      await updateProfileWithGIF(
        outputFile,
        videoName,
        segmentIndex,
        totalSegments
      );
    } catch (error) {
      console.error(`Error during ffmpeg processing: ${error}`);
      return;
    }
  } else {
    console.log(`GIF ${outputFile} already exists. Skipping creation.`);
  }

  moveToNextTask(segmentIndex, totalSegments, videoName, videoPath, outputDir);
}

function moveToNextTask(
  segmentIndex,
  totalSegments,
  videoName,
  videoPath,
  outputDir
) {
  if (segmentIndex + 1 < totalSegments) {
    console.log(`Queuing next segment for ${videoName}`);
    processingQueue.push({
      videoPath,
      outputDir,
      segmentIndex: segmentIndex + 1,
      totalSegments,
    });
  } else {
    console.log(`Completed processing all segments for ${videoName}.`);
  }
  isProcessing = false;
  // Directly call processQueue to check and start next available task
  processQueue();
}

function moveToNextTask(
  segmentIndex,
  totalSegments,
  videoName,
  videoPath,
  outputDir
) {
  if (segmentIndex + 1 < totalSegments) {
    processingQueue.unshift({
      videoPath,
      outputDir,
      segmentIndex: segmentIndex + 1,
      totalSegments: totalSegments,
    });
    console.log(`Queued next segment for ${videoName}`);
  } else {
    console.log(`Finished processing all segments for ${videoName}`);
  }

  setTimeout(() => {
    isProcessing = false;
    processQueue(); // Move to the next queue item after a short delay
  }, 1000); // Adjust delay as needed
}

function getVideoFiles(dir) {
  let videoFiles = [];

  function scanDirectory(directory) {
    fs.readdirSync(directory, { withFileTypes: true }).forEach((dirent) => {
      const absolutePath = path.join(directory, dirent.name);
      if (dirent.isDirectory()) {
        scanDirectory(absolutePath); // Recursively scan subdirectories
      } else if (isVideoFile(dirent.name)) {
        videoFiles.push(absolutePath); // Add video file to list
      }
    });
  }

  scanDirectory(dir); // Start scanning from the initial directory
  return videoFiles;
}

function isVideoFile(file) {
  const videoExtensions = new Set([".mp4", ".mkv"]);
  return videoExtensions.has(path.extname(file).toLowerCase());
}

function areGifsPresent(dir) {
  return (
    fs.existsSync(dir) &&
    fs.readdirSync(dir).some((file) => file.endsWith(".gif"))
  );
}

async function updateProfileWithGIF(
  gifPath,
  videoName,
  segmentIndex,
  totalSegments
) {
  console.log(`Attempting to update profile with GIF: ${gifPath}`);
  try {
    const data = fs.readFileSync(gifPath);

    if (togglePfpVsBanner) {
      console.log(`Setting new avatar...`);
      // Attempt to set the avatar with a retry mechanism on rate limit error
      await retryOnRateLimit(async () => {
        await client.user.setAvatar(data);
        console.log(`Profile picture updated successfully with ${gifPath}`);
      });
    } else {
      await client.user.setBanner(data);
    }

    if (shouldChangeNickname) {
      const newNickname = `${videoName}_part${segmentIndex + 1}`;
      console.log(`Setting new global name: ${newNickname}`);
      await client.user.setGlobalName(newNickname);
      console.log(`Global username updated to ${newNickname}`);
    }

    console.log(
      `Waiting ${segmentDuration} seconds before proceeding to the next segment...`
    );
    await new Promise((resolve) => setTimeout(resolve, segmentDuration * 1000));
  } catch (error) {
    console.error(`Failed to update profile with ${gifPath}: ${error}`);
  }
}

async function retryOnRateLimit(func, attempts = 3, delay = 60000) {
  for (let i = 0; i < attempts; i++) {
    try {
      await func();
      break; // Break out of loop if successful
    } catch (error) {
      if (
        error.message.includes("You are changing your avatar too fast") &&
        i < attempts - 1
      ) {
        console.log(
          `Rate limit hit, waiting ${delay / 1000} seconds before retrying...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        // Rethrow error if not related to rate limiting or out of retries
        throw error;
      }
    }
  }
}

client.login(process.env.DISCORD_TOKEN);