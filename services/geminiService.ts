/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {
  GoogleGenAI,
  Video,
  VideoGenerationReferenceImage,
  VideoGenerationReferenceType,
} from '@google/genai';
import {GenerateVideoParams, GenerationMode} from '../types';

export const enhancePrompt = async (currentPrompt: string): Promise<string> => {
  const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
  
  // Using Flash for fast prompt enhancement
  const model = 'gemini-2.5-flash-latest';
  
  const systemInstruction = `You are an expert prompt engineer for video generation. 
  You will receive a description. Describe this image in detail, send it back as JSON. 
  I want it super detailed so I can use it in an image/video generator. 
  
  Do not generate an image. Return ONLY valid JSON.
  
  Structure the JSON exactly like this example:
  {
    "image_metadata": {
      "format": "JPEG",
      "aspect_ratio": "3:2",
      "orientation": "Landscape"
    },
    "art_style": {
      "movement": "...",
      "technique": "...",
      "mood": "..."
    },
    "composition": { ... },
    "subjects": [ ... ],
    "environment": { ... },
    "color_palette": { ... }
  }`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: currentPrompt || "A creative scene",
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      }
    });

    const jsonText = response.text;
    if (!jsonText) return currentPrompt;

    const data = JSON.parse(jsonText);
    
    // Flatten the JSON into a rich descriptive string for Veo
    let enhanced = "";
    
    if (data.art_style) {
      enhanced += `Style: ${data.art_style.movement}, ${data.art_style.technique}, ${data.art_style.mood}. `;
    }
    
    if (data.subjects && Array.isArray(data.subjects)) {
      enhanced += "Subjects: ";
      data.subjects.forEach((sub: any) => {
        enhanced += `${sub.entity} (${sub.position}, ${sub.features?.pose || ''}), `;
      });
    }
    
    if (data.environment) {
      enhanced += `Setting: ${data.environment.setting}, ${data.environment.background}. `;
    }
    
    if (data.composition) {
      enhanced += `Lighting: ${data.composition.lighting}. `;
    }

    return enhanced.trim();
  } catch (e) {
    console.error("Prompt enhancement failed", e);
    return currentPrompt;
  }
};

// Fix: API key is now handled by process.env.API_KEY, so it's removed from parameters.
export const generateVideo = async (
  params: GenerateVideoParams,
): Promise<{objectUrl: string; blob: Blob; uri: string; video: Video}> => {
  console.log('Starting video generation with params:', params);

  // Fix: API key must be obtained from process.env.API_KEY as per guidelines.
  const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

  const config: any = {
    numberOfVideos: 1,
    resolution: params.resolution,
  };

  // Conditionally add aspect ratio. It's not used for extending videos.
  if (params.mode !== GenerationMode.EXTEND_VIDEO) {
    config.aspectRatio = params.aspectRatio;
  }

  const generateVideoPayload: any = {
    model: params.model,
    config: config,
  };

  // Only add the prompt if it's not empty, as an empty prompt might interfere with other parameters.
  if (params.prompt) {
    generateVideoPayload.prompt = params.prompt;
  }

  if (params.mode === GenerationMode.FRAMES_TO_VIDEO) {
    if (params.startFrame) {
      generateVideoPayload.image = {
        imageBytes: params.startFrame.base64,
        mimeType: params.startFrame.file.type,
      };
      console.log(
        `Generating with start frame: ${params.startFrame.file.name}`,
      );
    }

    const finalEndFrame = params.isLooping
      ? params.startFrame
      : params.endFrame;
    if (finalEndFrame) {
      generateVideoPayload.config.lastFrame = {
        imageBytes: finalEndFrame.base64,
        mimeType: finalEndFrame.file.type,
      };
      if (params.isLooping) {
        console.log(
          `Generating a looping video using start frame as end frame: ${finalEndFrame.file.name}`,
        );
      } else {
        console.log(`Generating with end frame: ${finalEndFrame.file.name}`);
      }
    }
  } else if (params.mode === GenerationMode.REFERENCES_TO_VIDEO) {
    const referenceImagesPayload: VideoGenerationReferenceImage[] = [];

    if (params.referenceImages) {
      for (const img of params.referenceImages) {
        console.log(`Adding reference image: ${img.file.name}`);
        referenceImagesPayload.push({
          image: {
            imageBytes: img.base64,
            mimeType: img.file.type,
          },
          referenceType: VideoGenerationReferenceType.ASSET,
        });
      }
    }

    if (params.styleImage) {
      console.log(
        `Adding style image as a reference: ${params.styleImage.file.name}`,
      );
      referenceImagesPayload.push({
        image: {
          imageBytes: params.styleImage.base64,
          mimeType: params.styleImage.file.type,
        },
        referenceType: VideoGenerationReferenceType.STYLE,
      });
    }

    if (referenceImagesPayload.length > 0) {
      generateVideoPayload.config.referenceImages = referenceImagesPayload;
    }
  } else if (params.mode === GenerationMode.EXTEND_VIDEO) {
    if (params.inputVideoObject) {
      generateVideoPayload.video = params.inputVideoObject;
      console.log(`Generating extension from input video object.`);
    } else {
      throw new Error('An input video object is required to extend a video.');
    }
  }

  console.log('Submitting video generation request...', generateVideoPayload);
  let operation = await ai.models.generateVideos(generateVideoPayload);
  console.log('Video generation operation started:', operation);

  while (!operation.done) {
    await new Promise((resolve) => setTimeout(resolve, 10000));
    console.log('...Generating...');
    operation = await ai.operations.getVideosOperation({operation: operation});
  }

  if (operation?.response) {
    const videos = operation.response.generatedVideos;

    if (!videos || videos.length === 0) {
      throw new Error('No videos were generated.');
    }

    const firstVideo = videos[0];
    if (!firstVideo?.video?.uri) {
      throw new Error('Generated video is missing a URI.');
    }
    const videoObject = firstVideo.video;

    const url = decodeURIComponent(videoObject.uri);
    console.log('Fetching video from:', url);

    // Fix: The API key for fetching the video must also come from process.env.API_KEY.
    const res = await fetch(`${url}&key=${process.env.API_KEY}`);

    if (!res.ok) {
      throw new Error(`Failed to fetch video: ${res.status} ${res.statusText}`);
    }

    const videoBlob = await res.blob();
    const objectUrl = URL.createObjectURL(videoBlob);

    return {objectUrl, blob: videoBlob, uri: url, video: videoObject};
  } else {
    console.error('Operation failed:', operation);
    throw new Error('No videos generated.');
  }
};