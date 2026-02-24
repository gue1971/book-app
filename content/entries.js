export const entries = [
  {
    id: "entry-001",
    title: "はじまりの章",
    initialView: "v-text",
    views: [
      {
        id: "v-text",
        type: "text",
        title: "本文",
        content:
          "これは最初の物語の導入部分です。PWA化することで、オフラインでも読めるようになります。没入感を大切にしてください。"
      },
      {
        id: "v-image",
        type: "image",
        title: "挿絵",
        content:
          "https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?q=80&w=1080&h=1800&fit=crop"
      }
    ]
  },
  {
    id: "entry-002",
    title: "PWAの魔法",
    initialView: "v-text",
    views: [
      {
        id: "v-text",
        type: "text",
        title: "本文",
        content:
          "PWAとしてインストールすると、ブラウザのツールバーが消え、1080x1920のフルキャンバスが活きてきます。"
      },
      {
        id: "v-quiz",
        type: "quiz",
        title: "問題",
        content: "PWAでオフライン動作を可能にする仕組みは？",
        options: ["Service Worker", "Canvas API", "Local Storage"],
        answer: 0
      },
      {
        id: "v-ans",
        type: "answer",
        title: "解答",
        content: "正解はService Workerです。ネットワークリクエストを仲介してキャッシュを制御します。"
      }
    ]
  }
];
