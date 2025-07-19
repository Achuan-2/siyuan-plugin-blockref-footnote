// vite.config.ts
import { resolve as resolve2 } from "path";
import { defineConfig } from "file:///D:/Code/siyuan-plugin-blockref-footnote/node_modules/.pnpm/vite@5.4.19_@types+node@20.19.7_sass@1.89.2/node_modules/vite/dist/node/index.js";
import { viteStaticCopy } from "file:///D:/Code/siyuan-plugin-blockref-footnote/node_modules/.pnpm/vite-plugin-static-copy@1.0_6b8a38b714781939e3b76c0f17b0b64d/node_modules/vite-plugin-static-copy/dist/index.js";
import { svelte } from "file:///D:/Code/siyuan-plugin-blockref-footnote/node_modules/.pnpm/@sveltejs+vite-plugin-svelt_965e8bb8ac95d8c617287d7be8534ea8/node_modules/@sveltejs/vite-plugin-svelte/src/index.js";
import zipPack from "file:///D:/Code/siyuan-plugin-blockref-footnote/node_modules/.pnpm/vite-plugin-zip-pack@1.2.4__dfb39556eb3f1a54d1ac7cacc16eed44/node_modules/vite-plugin-zip-pack/dist/esm/index.mjs";
import fg from "file:///D:/Code/siyuan-plugin-blockref-footnote/node_modules/.pnpm/fast-glob@3.3.3/node_modules/fast-glob/out/index.js";
import { execSync } from "child_process";

// yaml-plugin.js
import fs from "fs";
import yaml from "file:///D:/Code/siyuan-plugin-blockref-footnote/node_modules/.pnpm/js-yaml@4.1.0/node_modules/js-yaml/dist/js-yaml.mjs";
import { resolve } from "path";
function vitePluginYamlI18n(options = {}) {
  const DefaultOptions = {
    inDir: "src/i18n",
    outDir: "dist/i18n"
  };
  const finalOptions = { ...DefaultOptions, ...options };
  return {
    name: "vite-plugin-yaml-i18n",
    buildStart() {
      console.log("\u{1F308} Parse I18n: YAML to JSON..");
      const inDir = finalOptions.inDir;
      const outDir = finalOptions.outDir;
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }
      const files = fs.readdirSync(inDir);
      for (const file of files) {
        if (file.endsWith(".yaml") || file.endsWith(".yml")) {
          console.log(`-- Parsing ${file}`);
          const jsonFile = file.replace(/\.(yaml|yml)$/, ".json");
          if (files.includes(jsonFile)) {
            console.log(`---- File ${jsonFile} already exists, skipping...`);
            continue;
          }
          try {
            const filePath = resolve(inDir, file);
            const fileContents = fs.readFileSync(filePath, "utf8");
            const parsed = yaml.load(fileContents);
            const jsonContent = JSON.stringify(parsed, null, 2);
            const outputFilePath = resolve(outDir, file.replace(/\.(yaml|yml)$/, ".json"));
            console.log(`---- Writing to ${outputFilePath}`);
            fs.writeFileSync(outputFilePath, jsonContent);
          } catch (error) {
            this.error(`---- Error parsing YAML file ${file}: ${error.message}`);
          }
        }
      }
    }
  };
}

// vite.config.ts
var __vite_injected_original_dirname = "D:\\Code\\siyuan-plugin-blockref-footnote";
var env = process.env;
var isSrcmap = env.VITE_SOURCEMAP === "inline";
var isDev = env.NODE_ENV === "development";
var outputDir = isDev ? "dev" : "dist";
console.log("isDev=>", isDev);
console.log("isSrcmap=>", isSrcmap);
console.log("outputDir=>", outputDir);
var vite_config_default = defineConfig({
  resolve: {
    alias: {
      "@": resolve2(__vite_injected_original_dirname, "src")
    }
  },
  plugins: [
    svelte(),
    vitePluginYamlI18n({
      inDir: "public/i18n",
      outDir: `${outputDir}/i18n`
    }),
    viteStaticCopy({
      targets: [
        { src: "./README*.md", dest: "./" },
        { src: "./plugin.json", dest: "./" },
        { src: "./preview.png", dest: "./" },
        { src: "./icon.png", dest: "./" }
      ]
    }),
    // Auto copy to SiYuan plugins directory in dev mode
    ...isDev ? [
      {
        name: "auto-copy-to-siyuan",
        writeBundle() {
          try {
            execSync("node --no-warnings ./scripts/make_dev_copy.js", {
              stdio: "inherit",
              cwd: process.cwd()
            });
          } catch (error) {
            console.warn("Auto copy to SiYuan failed:", error.message);
            console.warn("You can manually run: pnpm run make-link-win");
          }
        }
      }
    ] : []
  ],
  define: {
    "process.env.DEV_MODE": JSON.stringify(isDev),
    "process.env.NODE_ENV": JSON.stringify(env.NODE_ENV)
  },
  build: {
    outDir: outputDir,
    emptyOutDir: false,
    minify: true,
    sourcemap: isSrcmap ? "inline" : false,
    lib: {
      entry: resolve2(__vite_injected_original_dirname, "src/index.ts"),
      fileName: "index",
      formats: ["cjs"]
    },
    rollupOptions: {
      plugins: [
        ...isDev ? [
          {
            name: "watch-external",
            async buildStart() {
              const files = await fg([
                "public/i18n/**",
                "./README*.md",
                "./plugin.json"
              ]);
              for (let file of files) {
                this.addWatchFile(file);
              }
            }
          }
        ] : [
          // Clean up unnecessary files under dist dir
          cleanupDistFiles({
            patterns: ["i18n/*.yaml", "i18n/*.md"],
            distDir: outputDir
          }),
          zipPack({
            inDir: "./dist",
            outDir: "./",
            outFileName: "package.zip"
          })
        ]
      ],
      external: ["siyuan", "process"],
      output: {
        entryFileNames: "[name].js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === "style.css") {
            return "index.css";
          }
          return assetInfo.name;
        }
      }
    }
  }
});
function cleanupDistFiles(options) {
  const {
    patterns,
    distDir
  } = options;
  return {
    name: "rollup-plugin-cleanup",
    enforce: "post",
    writeBundle: {
      sequential: true,
      order: "post",
      async handler() {
        const fg2 = await import("file:///D:/Code/siyuan-plugin-blockref-footnote/node_modules/.pnpm/fast-glob@3.3.3/node_modules/fast-glob/out/index.js");
        const fs2 = await import("fs");
        const distPatterns = patterns.map((pat) => `${distDir}/${pat}`);
        console.debug("Cleanup searching patterns:", distPatterns);
        const files = await fg2.default(distPatterns, {
          dot: true,
          absolute: true,
          onlyFiles: false
        });
        for (const file of files) {
          try {
            if (fs2.default.existsSync(file)) {
              const stat = fs2.default.statSync(file);
              if (stat.isDirectory()) {
                fs2.default.rmSync(file, { recursive: true });
              } else {
                fs2.default.unlinkSync(file);
              }
              console.log(`Cleaned up: ${file}`);
            }
          } catch (error) {
            console.error(`Failed to clean up ${file}:`, error);
          }
        }
      }
    }
  };
}
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAieWFtbC1wbHVnaW4uanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxDb2RlXFxcXHNpeXVhbi1wbHVnaW4tYmxvY2tyZWYtZm9vdG5vdGVcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXENvZGVcXFxcc2l5dWFuLXBsdWdpbi1ibG9ja3JlZi1mb290bm90ZVxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovQ29kZS9zaXl1YW4tcGx1Z2luLWJsb2NrcmVmLWZvb3Rub3RlL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gXCJwYXRoXCJcbmltcG9ydCB7IGRlZmluZUNvbmZpZywgbG9hZEVudiB9IGZyb20gXCJ2aXRlXCJcbmltcG9ydCB7IHZpdGVTdGF0aWNDb3B5IH0gZnJvbSBcInZpdGUtcGx1Z2luLXN0YXRpYy1jb3B5XCJcbmltcG9ydCBsaXZlcmVsb2FkIGZyb20gXCJyb2xsdXAtcGx1Z2luLWxpdmVyZWxvYWRcIlxuaW1wb3J0IHsgc3ZlbHRlIH0gZnJvbSBcIkBzdmVsdGVqcy92aXRlLXBsdWdpbi1zdmVsdGVcIlxuaW1wb3J0IHppcFBhY2sgZnJvbSBcInZpdGUtcGx1Z2luLXppcC1wYWNrXCI7XG5pbXBvcnQgZmcgZnJvbSAnZmFzdC1nbG9iJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgeyBleGVjU3luYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuXG5pbXBvcnQgdml0ZVBsdWdpbllhbWxJMThuIGZyb20gJy4veWFtbC1wbHVnaW4nO1xuXG5jb25zdCBlbnYgPSBwcm9jZXNzLmVudjtcbmNvbnN0IGlzU3JjbWFwID0gZW52LlZJVEVfU09VUkNFTUFQID09PSAnaW5saW5lJztcbmNvbnN0IGlzRGV2ID0gZW52Lk5PREVfRU5WID09PSAnZGV2ZWxvcG1lbnQnO1xuXG5jb25zdCBvdXRwdXREaXIgPSBpc0RldiA/IFwiZGV2XCIgOiBcImRpc3RcIjtcblxuY29uc29sZS5sb2coXCJpc0Rldj0+XCIsIGlzRGV2KTtcbmNvbnNvbGUubG9nKFwiaXNTcmNtYXA9PlwiLCBpc1NyY21hcCk7XG5jb25zb2xlLmxvZyhcIm91dHB1dERpcj0+XCIsIG91dHB1dERpcik7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gICAgcmVzb2x2ZToge1xuICAgICAgICBhbGlhczoge1xuICAgICAgICAgICAgXCJAXCI6IHJlc29sdmUoX19kaXJuYW1lLCBcInNyY1wiKSxcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBwbHVnaW5zOiBbXG4gICAgICAgIHN2ZWx0ZSgpLFxuXG4gICAgICAgIHZpdGVQbHVnaW5ZYW1sSTE4bih7XG4gICAgICAgICAgICBpbkRpcjogJ3B1YmxpYy9pMThuJyxcbiAgICAgICAgICAgIG91dERpcjogYCR7b3V0cHV0RGlyfS9pMThuYFxuICAgICAgICB9KSxcblxuICAgICAgICB2aXRlU3RhdGljQ29weSh7XG4gICAgICAgICAgICB0YXJnZXRzOiBbXG4gICAgICAgICAgICAgICAgeyBzcmM6IFwiLi9SRUFETUUqLm1kXCIsIGRlc3Q6IFwiLi9cIiB9LFxuICAgICAgICAgICAgICAgIHsgc3JjOiBcIi4vcGx1Z2luLmpzb25cIiwgZGVzdDogXCIuL1wiIH0sXG4gICAgICAgICAgICAgICAgeyBzcmM6IFwiLi9wcmV2aWV3LnBuZ1wiLCBkZXN0OiBcIi4vXCIgfSxcbiAgICAgICAgICAgICAgICB7IHNyYzogXCIuL2ljb24ucG5nXCIsIGRlc3Q6IFwiLi9cIiB9XG4gICAgICAgICAgICBdLFxuICAgICAgICB9KSxcblxuICAgICAgICAvLyBBdXRvIGNvcHkgdG8gU2lZdWFuIHBsdWdpbnMgZGlyZWN0b3J5IGluIGRldiBtb2RlXG4gICAgICAgIC4uLihpc0RldiA/IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnYXV0by1jb3B5LXRvLXNpeXVhbicsXG4gICAgICAgICAgICAgICAgd3JpdGVCdW5kbGUoKSB7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBSdW4gdGhlIGNvcHkgc2NyaXB0IGFmdGVyIGJ1aWxkXG4gICAgICAgICAgICAgICAgICAgICAgICBleGVjU3luYygnbm9kZSAtLW5vLXdhcm5pbmdzIC4vc2NyaXB0cy9tYWtlX2Rldl9jb3B5LmpzJywge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0ZGlvOiAnaW5oZXJpdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3dkOiBwcm9jZXNzLmN3ZCgpXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignQXV0byBjb3B5IHRvIFNpWXVhbiBmYWlsZWQ6JywgZXJyb3IubWVzc2FnZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1lvdSBjYW4gbWFudWFsbHkgcnVuOiBwbnBtIHJ1biBtYWtlLWxpbmstd2luJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIF0gOiBbXSksXG5cbiAgICBdLFxuXG4gICAgZGVmaW5lOiB7XG4gICAgICAgIFwicHJvY2Vzcy5lbnYuREVWX01PREVcIjogSlNPTi5zdHJpbmdpZnkoaXNEZXYpLFxuICAgICAgICBcInByb2Nlc3MuZW52Lk5PREVfRU5WXCI6IEpTT04uc3RyaW5naWZ5KGVudi5OT0RFX0VOVilcbiAgICB9LFxuXG4gICAgYnVpbGQ6IHtcbiAgICAgICAgb3V0RGlyOiBvdXRwdXREaXIsXG4gICAgICAgIGVtcHR5T3V0RGlyOiBmYWxzZSxcbiAgICAgICAgbWluaWZ5OiB0cnVlLFxuICAgICAgICBzb3VyY2VtYXA6IGlzU3JjbWFwID8gJ2lubGluZScgOiBmYWxzZSxcblxuICAgICAgICBsaWI6IHtcbiAgICAgICAgICAgIGVudHJ5OiByZXNvbHZlKF9fZGlybmFtZSwgXCJzcmMvaW5kZXgudHNcIiksXG4gICAgICAgICAgICBmaWxlTmFtZTogXCJpbmRleFwiLFxuICAgICAgICAgICAgZm9ybWF0czogW1wiY2pzXCJdLFxuICAgICAgICB9LFxuICAgICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgICAgICBwbHVnaW5zOiBbXG4gICAgICAgICAgICAgICAgLi4uKGlzRGV2ID8gW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiAnd2F0Y2gtZXh0ZXJuYWwnLFxuICAgICAgICAgICAgICAgICAgICAgICAgYXN5bmMgYnVpbGRTdGFydCgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlcyA9IGF3YWl0IGZnKFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ3B1YmxpYy9pMThuLyoqJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJy4vUkVBRE1FKi5tZCcsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICcuL3BsdWdpbi5qc29uJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGZpbGUgb2YgZmlsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRXYXRjaEZpbGUoZmlsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXSA6IFtcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYW4gdXAgdW5uZWNlc3NhcnkgZmlsZXMgdW5kZXIgZGlzdCBkaXJcbiAgICAgICAgICAgICAgICAgICAgY2xlYW51cERpc3RGaWxlcyh7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXR0ZXJuczogWydpMThuLyoueWFtbCcsICdpMThuLyoubWQnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpc3REaXI6IG91dHB1dERpclxuICAgICAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICAgICAgemlwUGFjayh7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbkRpcjogJy4vZGlzdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBvdXREaXI6ICcuLycsXG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRGaWxlTmFtZTogJ3BhY2thZ2UuemlwJ1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgIF0pXG4gICAgICAgICAgICBdLFxuXG4gICAgICAgICAgICBleHRlcm5hbDogW1wic2l5dWFuXCIsIFwicHJvY2Vzc1wiXSxcblxuICAgICAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgICAgICAgZW50cnlGaWxlTmFtZXM6IFwiW25hbWVdLmpzXCIsXG4gICAgICAgICAgICAgICAgYXNzZXRGaWxlTmFtZXM6IChhc3NldEluZm8pID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFzc2V0SW5mby5uYW1lID09PSBcInN0eWxlLmNzc1wiKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJpbmRleC5jc3NcIlxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhc3NldEluZm8ubmFtZVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgIH1cbn0pO1xuXG5cbi8qKlxuICogQ2xlYW4gdXAgc29tZSBkaXN0IGZpbGVzIGFmdGVyIGNvbXBpbGVkXG4gKiBAYXV0aG9yIGZyb3N0aW1lXG4gKiBAcGFyYW0gb3B0aW9uczpcbiAqIEByZXR1cm5zIFxuICovXG5mdW5jdGlvbiBjbGVhbnVwRGlzdEZpbGVzKG9wdGlvbnM6IHsgcGF0dGVybnM6IHN0cmluZ1tdLCBkaXN0RGlyOiBzdHJpbmcgfSkge1xuICAgIGNvbnN0IHtcbiAgICAgICAgcGF0dGVybnMsXG4gICAgICAgIGRpc3REaXJcbiAgICB9ID0gb3B0aW9ucztcblxuICAgIHJldHVybiB7XG4gICAgICAgIG5hbWU6ICdyb2xsdXAtcGx1Z2luLWNsZWFudXAnLFxuICAgICAgICBlbmZvcmNlOiAncG9zdCcsXG4gICAgICAgIHdyaXRlQnVuZGxlOiB7XG4gICAgICAgICAgICBzZXF1ZW50aWFsOiB0cnVlLFxuICAgICAgICAgICAgb3JkZXI6ICdwb3N0JyBhcyAncG9zdCcsXG4gICAgICAgICAgICBhc3luYyBoYW5kbGVyKCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGZnID0gYXdhaXQgaW1wb3J0KCdmYXN0LWdsb2InKTtcbiAgICAgICAgICAgICAgICBjb25zdCBmcyA9IGF3YWl0IGltcG9ydCgnZnMnKTtcbiAgICAgICAgICAgICAgICAvLyBjb25zdCBwYXRoID0gYXdhaXQgaW1wb3J0KCdwYXRoJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBcdTRGN0ZcdTc1MjggZ2xvYiBcdThCRURcdTZDRDVcdUZGMENcdTc4NkVcdTRGRERcdTgwRkRcdTUzMzlcdTkxNERcdTUyMzBcdTY1ODdcdTRFRjZcbiAgICAgICAgICAgICAgICBjb25zdCBkaXN0UGF0dGVybnMgPSBwYXR0ZXJucy5tYXAocGF0ID0+IGAke2Rpc3REaXJ9LyR7cGF0fWApO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZGVidWcoJ0NsZWFudXAgc2VhcmNoaW5nIHBhdHRlcm5zOicsIGRpc3RQYXR0ZXJucyk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBmaWxlcyA9IGF3YWl0IGZnLmRlZmF1bHQoZGlzdFBhdHRlcm5zLCB7XG4gICAgICAgICAgICAgICAgICAgIGRvdDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgYWJzb2x1dGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIG9ubHlGaWxlczogZmFsc2VcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUuaW5mbygnRmlsZXMgdG8gYmUgY2xlYW5lZCB1cDonLCBmaWxlcyk7XG5cbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmcy5kZWZhdWx0LmV4aXN0c1N5bmMoZmlsZSkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0ID0gZnMuZGVmYXVsdC5zdGF0U3luYyhmaWxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoc3RhdC5pc0RpcmVjdG9yeSgpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZzLmRlZmF1bHQucm1TeW5jKGZpbGUsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZzLmRlZmF1bHQudW5saW5rU3luYyhmaWxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYENsZWFuZWQgdXA6ICR7ZmlsZX1gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byBjbGVhbiB1cCAke2ZpbGV9OmAsIGVycm9yKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH07XG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkQ6XFxcXENvZGVcXFxcc2l5dWFuLXBsdWdpbi1ibG9ja3JlZi1mb290bm90ZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRDpcXFxcQ29kZVxcXFxzaXl1YW4tcGx1Z2luLWJsb2NrcmVmLWZvb3Rub3RlXFxcXHlhbWwtcGx1Z2luLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9Db2RlL3NpeXVhbi1wbHVnaW4tYmxvY2tyZWYtZm9vdG5vdGUveWFtbC1wbHVnaW4uanNcIjsvKlxuICogQ29weXJpZ2h0IChjKSAyMDI0IGJ5IGZyb3N0aW1lLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICogQEF1dGhvciAgICAgICA6IGZyb3N0aW1lXG4gKiBARGF0ZSAgICAgICAgIDogMjAyNC0wNC0wNSAyMToyNzo1NVxuICogQEZpbGVQYXRoICAgICA6IC95YW1sLXBsdWdpbi5qc1xuICogQExhc3RFZGl0VGltZSA6IDIwMjQtMDQtMDUgMjI6NTM6MzRcbiAqIEBEZXNjcmlwdGlvbiAgOiBcdTUzQkJcdTU5QUVcdTczOUJcdTc2ODQganNvbiBcdTY4M0NcdTVGMEZcdUZGMENcdTYyMTFcdTVDMzFcdTY2MkZcdTg5ODFcdTc1MjggeWFtbCBcdTUxOTkgaTE4blxuICovXG4vLyBwbHVnaW5zL3ZpdGUtcGx1Z2luLXBhcnNlLXlhbWwuanNcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgeWFtbCBmcm9tICdqcy15YW1sJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gdml0ZVBsdWdpbllhbWxJMThuKG9wdGlvbnMgPSB7fSkge1xuICAgIC8vIERlZmF1bHQgb3B0aW9ucyB3aXRoIGEgZmFsbGJhY2tcbiAgICBjb25zdCBEZWZhdWx0T3B0aW9ucyA9IHtcbiAgICAgICAgaW5EaXI6ICdzcmMvaTE4bicsXG4gICAgICAgIG91dERpcjogJ2Rpc3QvaTE4bicsXG4gICAgfTtcblxuICAgIGNvbnN0IGZpbmFsT3B0aW9ucyA9IHsgLi4uRGVmYXVsdE9wdGlvbnMsIC4uLm9wdGlvbnMgfTtcblxuICAgIHJldHVybiB7XG4gICAgICAgIG5hbWU6ICd2aXRlLXBsdWdpbi15YW1sLWkxOG4nLFxuICAgICAgICBidWlsZFN0YXJ0KCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ1x1RDgzQ1x1REYwOCBQYXJzZSBJMThuOiBZQU1MIHRvIEpTT04uLicpO1xuICAgICAgICAgICAgY29uc3QgaW5EaXIgPSBmaW5hbE9wdGlvbnMuaW5EaXI7XG4gICAgICAgICAgICBjb25zdCBvdXREaXIgPSBmaW5hbE9wdGlvbnMub3V0RGlyXG5cbiAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhvdXREaXIpKSB7XG4gICAgICAgICAgICAgICAgZnMubWtkaXJTeW5jKG91dERpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vUGFyc2UgeWFtbCBmaWxlLCBvdXRwdXQgdG8ganNvblxuICAgICAgICAgICAgY29uc3QgZmlsZXMgPSBmcy5yZWFkZGlyU3luYyhpbkRpcik7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoZmlsZS5lbmRzV2l0aCgnLnlhbWwnKSB8fCBmaWxlLmVuZHNXaXRoKCcueW1sJykpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYC0tIFBhcnNpbmcgJHtmaWxlfWApXG4gICAgICAgICAgICAgICAgICAgIC8vXHU2OEMwXHU2N0U1XHU2NjJGXHU1NDI2XHU2NzA5XHU1NDBDXHU1NDBEXHU3Njg0anNvblx1NjU4N1x1NEVGNlxuICAgICAgICAgICAgICAgICAgICBjb25zdCBqc29uRmlsZSA9IGZpbGUucmVwbGFjZSgvXFwuKHlhbWx8eW1sKSQvLCAnLmpzb24nKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZpbGVzLmluY2x1ZGVzKGpzb25GaWxlKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYC0tLS0gRmlsZSAke2pzb25GaWxlfSBhbHJlYWR5IGV4aXN0cywgc2tpcHBpbmcuLi5gKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlUGF0aCA9IHJlc29sdmUoaW5EaXIsIGZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZUNvbnRlbnRzID0gZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCAndXRmOCcpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyc2VkID0geWFtbC5sb2FkKGZpbGVDb250ZW50cyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBqc29uQ29udGVudCA9IEpTT04uc3RyaW5naWZ5KHBhcnNlZCwgbnVsbCwgMik7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvdXRwdXRGaWxlUGF0aCA9IHJlc29sdmUob3V0RGlyLCBmaWxlLnJlcGxhY2UoL1xcLih5YW1sfHltbCkkLywgJy5qc29uJykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYC0tLS0gV3JpdGluZyB0byAke291dHB1dEZpbGVQYXRofWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhvdXRwdXRGaWxlUGF0aCwganNvbkNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5lcnJvcihgLS0tLSBFcnJvciBwYXJzaW5nIFlBTUwgZmlsZSAke2ZpbGV9OiAke2Vycm9yLm1lc3NhZ2V9YCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgfTtcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBNlMsU0FBUyxXQUFBQSxnQkFBZTtBQUNyVSxTQUFTLG9CQUE2QjtBQUN0QyxTQUFTLHNCQUFzQjtBQUUvQixTQUFTLGNBQWM7QUFDdkIsT0FBTyxhQUFhO0FBQ3BCLE9BQU8sUUFBUTtBQUVmLFNBQVMsZ0JBQWdCOzs7QUNDekIsT0FBTyxRQUFRO0FBQ2YsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsZUFBZTtBQUVULFNBQVIsbUJBQW9DLFVBQVUsQ0FBQyxHQUFHO0FBRXJELFFBQU0saUJBQWlCO0FBQUEsSUFDbkIsT0FBTztBQUFBLElBQ1AsUUFBUTtBQUFBLEVBQ1o7QUFFQSxRQUFNLGVBQWUsRUFBRSxHQUFHLGdCQUFnQixHQUFHLFFBQVE7QUFFckQsU0FBTztBQUFBLElBQ0gsTUFBTTtBQUFBLElBQ04sYUFBYTtBQUNULGNBQVEsSUFBSSxzQ0FBK0I7QUFDM0MsWUFBTSxRQUFRLGFBQWE7QUFDM0IsWUFBTSxTQUFTLGFBQWE7QUFFNUIsVUFBSSxDQUFDLEdBQUcsV0FBVyxNQUFNLEdBQUc7QUFDeEIsV0FBRyxVQUFVLFFBQVEsRUFBRSxXQUFXLEtBQUssQ0FBQztBQUFBLE1BQzVDO0FBR0EsWUFBTSxRQUFRLEdBQUcsWUFBWSxLQUFLO0FBQ2xDLGlCQUFXLFFBQVEsT0FBTztBQUN0QixZQUFJLEtBQUssU0FBUyxPQUFPLEtBQUssS0FBSyxTQUFTLE1BQU0sR0FBRztBQUNqRCxrQkFBUSxJQUFJLGNBQWMsSUFBSSxFQUFFO0FBRWhDLGdCQUFNLFdBQVcsS0FBSyxRQUFRLGlCQUFp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QUFBQSxVQUNWLFdBQVc7QUFBQSxRQUNmLENBQUM7QUFJRCxtQkFBVyxRQUFRLE9BQU87QUFDdEIsY0FBSTtBQUNBLGdCQUFJQyxJQUFHLFFBQVEsV0FBVyxJQUFJLEdBQUc7QUFDN0Isb0JBQU0sT0FBT0EsSUFBRyxRQUFRLFNBQVMsSUFBSTtBQUNyQyxrQkFBSSxLQUFLLFlBQVksR0FBRztBQUNwQixnQkFBQUEsSUFBRyxRQUFRLE9BQU8sTUFBTSxFQUFFLFdBQVcsS0FBSyxDQUFDO0FBQUEsY0FDL0MsT0FBTztBQUNILGdCQUFBQSxJQUFHLFFBQVEsV0FBVyxJQUFJO0FBQUEsY0FDOUI7QUFDQSxzQkFBUSxJQUFJLGVBQWUsSUFBSSxFQUFFO0FBQUEsWUFDckM7QUFBQSxVQUNKLFNBQVMsT0FBTztBQUNaLG9CQUFRLE1BQU0sc0JBQXNCLElBQUksS0FBSyxLQUFLO0FBQUEsVUFDdEQ7QUFBQSxRQUNKO0FBQUEsTUFDSjtBQUFBLElBQ0o7QUFBQSxFQUNKO0FBQ0o7IiwKICAibmFtZXMiOiBbInJlc29sdmUiLCAicmVzb2x2ZSIsICJmZyIsICJmcyJdCn0K
