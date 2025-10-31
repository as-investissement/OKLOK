// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///home/project/node_modules/vite-plugin-pwa/dist/index.js";
var vite_config_default = defineConfig(({ mode }) => ({
  // Capacitor : chemins relatifs ; Web/Netlify : racine
  base: mode === "capacitor" ? "" : "/",
  plugins: [
    react(),
    // N'active le PWA que pour le web (évite les soucis en app)
    mode !== "capacitor" && VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
      manifest: {
        name: "Feuilles de Temps",
        short_name: "Feuilles de Temps",
        description: "Application de gestion des feuilles de temps",
        theme_color: "#1e40af",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      }
    })
  ].filter(Boolean),
  optimizeDeps: { exclude: ["lucide-react"] },
  build: { rollupOptions: { output: { manualChunks: void 0 } } }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyBWaXRlUFdBIH0gZnJvbSAndml0ZS1wbHVnaW4tcHdhJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4gKHtcbiAgLy8gQ2FwYWNpdG9yIDogY2hlbWlucyByZWxhdGlmcyA7IFdlYi9OZXRsaWZ5IDogcmFjaW5lXG4gIGJhc2U6IG1vZGUgPT09ICdjYXBhY2l0b3InID8gJycgOiAnLycsXG4gIHBsdWdpbnM6IFtcbiAgICByZWFjdCgpLFxuICAgIC8vIE4nYWN0aXZlIGxlIFBXQSBxdWUgcG91ciBsZSB3ZWIgKFx1MDBFOXZpdGUgbGVzIHNvdWNpcyBlbiBhcHApXG4gICAgbW9kZSAhPT0gJ2NhcGFjaXRvcicgJiZcbiAgICAgIFZpdGVQV0Eoe1xuICAgICAgICByZWdpc3RlclR5cGU6ICdhdXRvVXBkYXRlJyxcbiAgICAgICAgaW5jbHVkZUFzc2V0czogWydmYXZpY29uLmljbycsICdhcHBsZS10b3VjaC1pY29uLnBuZycsICdtYXNrLWljb24uc3ZnJ10sXG4gICAgICAgIG1hbmlmZXN0OiB7XG4gICAgICAgICAgbmFtZTogJ0ZldWlsbGVzIGRlIFRlbXBzJyxcbiAgICAgICAgICBzaG9ydF9uYW1lOiAnRmV1aWxsZXMgZGUgVGVtcHMnLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQXBwbGljYXRpb24gZGUgZ2VzdGlvbiBkZXMgZmV1aWxsZXMgZGUgdGVtcHMnLFxuICAgICAgICAgIHRoZW1lX2NvbG9yOiAnIzFlNDBhZicsXG4gICAgICAgICAgYmFja2dyb3VuZF9jb2xvcjogJyNmZmZmZmYnLFxuICAgICAgICAgIGRpc3BsYXk6ICdzdGFuZGFsb25lJyxcbiAgICAgICAgICBvcmllbnRhdGlvbjogJ3BvcnRyYWl0JyxcbiAgICAgICAgICBzY29wZTogJy8nLFxuICAgICAgICAgIHN0YXJ0X3VybDogJy8nLFxuICAgICAgICAgIGljb25zOiBbXG4gICAgICAgICAgICB7IHNyYzogJ3B3YS02NHg2NC5wbmcnLCBzaXplczogJzY0eDY0JywgdHlwZTogJ2ltYWdlL3BuZycgfSxcbiAgICAgICAgICAgIHsgc3JjOiAncHdhLTE5MngxOTIucG5nJywgc2l6ZXM6ICcxOTJ4MTkyJywgdHlwZTogJ2ltYWdlL3BuZycgfSxcbiAgICAgICAgICAgIHsgc3JjOiAncHdhLTUxMng1MTIucG5nJywgc2l6ZXM6ICc1MTJ4NTEyJywgdHlwZTogJ2ltYWdlL3BuZycsIHB1cnBvc2U6ICdhbnknIH0sXG4gICAgICAgICAgICB7IHNyYzogJ21hc2thYmxlLWljb24tNTEyeDUxMi5wbmcnLCBzaXplczogJzUxMng1MTInLCB0eXBlOiAnaW1hZ2UvcG5nJywgcHVycG9zZTogJ21hc2thYmxlJyB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHdvcmtib3g6IHtcbiAgICAgICAgICBnbG9iUGF0dGVybnM6IFsnKiovKi57anMsY3NzLGh0bWwsaWNvLHBuZyxzdmcsd29mZix3b2ZmMn0nXSxcbiAgICAgICAgICBydW50aW1lQ2FjaGluZzogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXmh0dHBzOlxcL1xcL2ZvbnRzXFwuZ29vZ2xlYXBpc1xcLmNvbVxcLy4qL2ksXG4gICAgICAgICAgICAgIGhhbmRsZXI6ICdDYWNoZUZpcnN0JyxcbiAgICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICAgIGNhY2hlTmFtZTogJ2dvb2dsZS1mb250cy1jYWNoZScsXG4gICAgICAgICAgICAgICAgZXhwaXJhdGlvbjogeyBtYXhFbnRyaWVzOiAxMCwgbWF4QWdlU2Vjb25kczogNjAgKiA2MCAqIDI0ICogMzY1IH0sXG4gICAgICAgICAgICAgICAgY2FjaGVhYmxlUmVzcG9uc2U6IHsgc3RhdHVzZXM6IFswLCAyMDBdIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXmh0dHBzOlxcL1xcL2ZvbnRzXFwuZ3N0YXRpY1xcLmNvbVxcLy4qL2ksXG4gICAgICAgICAgICAgIGhhbmRsZXI6ICdDYWNoZUZpcnN0JyxcbiAgICAgICAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgICAgICAgIGNhY2hlTmFtZTogJ2dzdGF0aWMtZm9udHMtY2FjaGUnLFxuICAgICAgICAgICAgICAgIGV4cGlyYXRpb246IHsgbWF4RW50cmllczogMTAsIG1heEFnZVNlY29uZHM6IDYwICogNjAgKiAyNCAqIDM2NSB9LFxuICAgICAgICAgICAgICAgIGNhY2hlYWJsZVJlc3BvbnNlOiB7IHN0YXR1c2VzOiBbMCwgMjAwXSB9LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgfSksXG4gIF0uZmlsdGVyKEJvb2xlYW4pLFxuICBvcHRpbWl6ZURlcHM6IHsgZXhjbHVkZTogWydsdWNpZGUtcmVhY3QnXSB9LFxuICBidWlsZDogeyByb2xsdXBPcHRpb25zOiB7IG91dHB1dDogeyBtYW51YWxDaHVua3M6IHVuZGVmaW5lZCB9IH0gfSxcbn0pKTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBeU4sU0FBUyxvQkFBb0I7QUFDdFAsT0FBTyxXQUFXO0FBQ2xCLFNBQVMsZUFBZTtBQUV4QixJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssT0FBTztBQUFBO0FBQUEsRUFFekMsTUFBTSxTQUFTLGNBQWMsS0FBSztBQUFBLEVBQ2xDLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQTtBQUFBLElBRU4sU0FBUyxlQUNQLFFBQVE7QUFBQSxNQUNOLGNBQWM7QUFBQSxNQUNkLGVBQWUsQ0FBQyxlQUFlLHdCQUF3QixlQUFlO0FBQUEsTUFDdEUsVUFBVTtBQUFBLFFBQ1IsTUFBTTtBQUFBLFFBQ04sWUFBWTtBQUFBLFFBQ1osYUFBYTtBQUFBLFFBQ2IsYUFBYTtBQUFBLFFBQ2Isa0JBQWtCO0FBQUEsUUFDbEIsU0FBUztBQUFBLFFBQ1QsYUFBYTtBQUFBLFFBQ2IsT0FBTztBQUFBLFFBQ1AsV0FBVztBQUFBLFFBQ1gsT0FBTztBQUFBLFVBQ0wsRUFBRSxLQUFLLGlCQUFpQixPQUFPLFNBQVMsTUFBTSxZQUFZO0FBQUEsVUFDMUQsRUFBRSxLQUFLLG1CQUFtQixPQUFPLFdBQVcsTUFBTSxZQUFZO0FBQUEsVUFDOUQsRUFBRSxLQUFLLG1CQUFtQixPQUFPLFdBQVcsTUFBTSxhQUFhLFNBQVMsTUFBTTtBQUFBLFVBQzlFLEVBQUUsS0FBSyw2QkFBNkIsT0FBTyxXQUFXLE1BQU0sYUFBYSxTQUFTLFdBQVc7QUFBQSxRQUMvRjtBQUFBLE1BQ0Y7QUFBQSxNQUNBLFNBQVM7QUFBQSxRQUNQLGNBQWMsQ0FBQywyQ0FBMkM7QUFBQSxRQUMxRCxnQkFBZ0I7QUFBQSxVQUNkO0FBQUEsWUFDRSxZQUFZO0FBQUEsWUFDWixTQUFTO0FBQUEsWUFDVCxTQUFTO0FBQUEsY0FDUCxXQUFXO0FBQUEsY0FDWCxZQUFZLEVBQUUsWUFBWSxJQUFJLGVBQWUsS0FBSyxLQUFLLEtBQUssSUFBSTtBQUFBLGNBQ2hFLG1CQUFtQixFQUFFLFVBQVUsQ0FBQyxHQUFHLEdBQUcsRUFBRTtBQUFBLFlBQzFDO0FBQUEsVUFDRjtBQUFBLFVBQ0E7QUFBQSxZQUNFLFlBQVk7QUFBQSxZQUNaLFNBQVM7QUFBQSxZQUNULFNBQVM7QUFBQSxjQUNQLFdBQVc7QUFBQSxjQUNYLFlBQVksRUFBRSxZQUFZLElBQUksZUFBZSxLQUFLLEtBQUssS0FBSyxJQUFJO0FBQUEsY0FDaEUsbUJBQW1CLEVBQUUsVUFBVSxDQUFDLEdBQUcsR0FBRyxFQUFFO0FBQUEsWUFDMUM7QUFBQSxVQUNGO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGLENBQUM7QUFBQSxFQUNMLEVBQUUsT0FBTyxPQUFPO0FBQUEsRUFDaEIsY0FBYyxFQUFFLFNBQVMsQ0FBQyxjQUFjLEVBQUU7QUFBQSxFQUMxQyxPQUFPLEVBQUUsZUFBZSxFQUFFLFFBQVEsRUFBRSxjQUFjLE9BQVUsRUFBRSxFQUFFO0FBQ2xFLEVBQUU7IiwKICAibmFtZXMiOiBbXQp9Cg==
