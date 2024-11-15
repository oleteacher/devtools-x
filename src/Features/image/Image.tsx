import {
  Box,
  Button,
  Divider,
  Group,
  LoadingOverlay,
  NativeSelect,
  Slider,
  Stack,
  Text,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import {
  ReactCompareSlider,
  ReactCompareSliderImage,
} from "react-compare-slider";

type ImageType = "Jpeg" | "Png" | "Webp";

export default function Image2() {
  const [imageSrc, setImageSrc] = useState("");
  const [converted, setConverted] = useState<string | null>(null);
  const [quality, setQuality] = useState(50);
  const [doubouncedQuality] = useDebouncedValue(quality, 500);
  const [imageType, setImageType] = useState<ImageType>("Jpeg");
  const [loading, setLoading] = useState(false);

  const [sizes, setSizes] = useState({
    og: "0",
    conv: "0",
  });

  const selectImage = async () => {
    try {
      console.debug("selecting image");
      const p = await open({
        multiple: false,
        title: "Select an Image",
        directory: false,
      });

      if (!p) return;

      const path = p as string;
      const assetUrl = convertFileSrc(path);
      const response = await fetch(assetUrl);
      const blob = await response.blob();
      const sizeInBytes = blob.size / 1024;

      setSizes({
        og: sizeInBytes.toFixed(2),
        conv: "0",
      });
      setImageSrc(path);
    } catch (e) {
      console.error("Error selecting image:", e);
    }
  };

  const resize = async () => {
    if (!imageSrc) return;
    console.log("resize", imageSrc);

    try {
      setLoading(true);
      console.time("resize");
	  
	  await new Promise(resolve => setTimeout(resolve, 100));

      const buff = await invoke<number[]>("compress_images_to_buffer", {
        imagePath: imageSrc,
        quality: quality,
        format: imageType,
      });

      const blob = new Blob([new Uint8Array(buff)], {
	  type: `image/${imageType.toLowerCase()}`,
	});

      // Clean up previous URL if it exists
      if (converted) {
        URL.revokeObjectURL(converted);
      }

      const url = URL.createObjectURL(blob);
      console.timeEnd("resize");

      setSizes(prev => ({
        ...prev,
        conv: (blob.size / 1024).toFixed(2),
      }));
      setConverted(url);
    } catch (e) {
      console.error("Error while resizing image:", e);
    } finally {
      setLoading(false);
    }
  };

  const download = async () => {
    if (!converted) return;
    try {
      const downloadPath = await save({
        defaultPath: `compressed.${quality}.${imageType.toLowerCase()}`,
        filters: [{ name: "images", extensions: [imageType.toLowerCase()] }],
        title: "Select location",
      });

      if (!downloadPath) return;

      const response = await fetch(converted);
      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();
      await writeFile(downloadPath, new Uint8Array(buffer));
    } catch (e) {
      console.error("Error saving file:", e);
    }
  };

  useEffect(() => {
    let mounted = true;

    const performResize = async () => {
      if (!imageSrc || !mounted) return;
      await resize();
    };

    performResize();

    return () => {
      mounted = false;
      if (converted) {
        URL.revokeObjectURL(converted);
      }
    };
  }, [imageSrc, doubouncedQuality, imageType]);

  return (
    <Stack
      style={{
        height: "100%",
        overflow: "auto",
      }}
    >
      <Group align="center" justify="center">
        <Button onClick={selectImage}>Select image</Button>
        {converted && <Button onClick={download}>Save</Button>}
      </Group>

      <LoadingOverlay
        visible={loading}
        overlayProps={{ radius: "sm", blur: 2 }}
      />

      {converted && (
        <Box>
          <ReactCompareSlider
            transition="0.25s cubic-bezier(0.645, 0.045, 0.355, 1)"
            style={{
              width: "100%",
              height: "70vh",
            }}
            onlyHandleDraggable={true}
            itemOne={
              <ReactCompareSliderImage
                style={{
                  objectFit: "contain",
                }}
                src={convertFileSrc(imageSrc)}
                alt="Original"
              />
            }
            itemTwo={
              <ReactCompareSliderImage
                style={{
                  objectFit: "contain",
                }}
                src={converted}
                alt="Converted"
              />
            }
          />
        </Box>
      )}

      {converted && (
        <Box style={{ position: "relative" }}>
          <Stack
            align="left"
            gap="sm"
            style={{
              position: "absolute",
              right: 10,
              bottom: 40,
              backgroundColor: "var(--mantine-color-dark-8)",
              padding: 15,
              borderRadius: 9,
              width: 250,
            }}
          >
            <NativeSelect
              value={imageType}
              data={["Jpeg", "Png", "Webp"]}
              onChange={(e) => setImageType(e.currentTarget.value as ImageType)}
            />
            <Divider />
            <Slider
              min={0}
              max={100}
              value={quality}
              onChange={setQuality}
              label={`${quality}%`}
              aria-label="Quality slider"
              labelTransitionProps={{
                transition: "skew-down",
                duration: 150,
                timingFunction: "ease",
              }}
            />
            <Box>
              <Text c="blue">Original: {sizes.og}kb</Text>
              <Text c={Number(sizes.conv) > Number(sizes.og) ? "red" : "green"}>
                Converted: {sizes.conv}kb
              </Text>
            </Box>
          </Stack>
          <Text c="dimmed" size="xs">
            NOTE: Large images may take a while to load, instead try
            squoosh.app/
          </Text>
        </Box>
      )}
    </Stack>
  );
}
