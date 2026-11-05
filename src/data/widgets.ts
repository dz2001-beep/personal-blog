/**
 * 个性化小组件数据:一言语录 + 友链
 * 修改这里的数组即可自定义内容
 */

/** 一言:侧栏自动轮播的语录(程序员/古风/人生感悟) */
export const QUOTES: string[] = [
  'Talk is cheap. Show me the code. —— Linus Torvalds',
  '简单是可靠的前提。 —— Edsger Dijkstra',
  '程序员的三重境界:能用就行、好用、优雅。',
  '纸上得来终觉浅,绝知此事要躬行。',
  '山不厌高,海不厌深。',
  '不积跬步,无以至千里;不积小流,无以成江海。',
  'Stay hungry, stay foolish. —— Steve Jobs',
  '先解决能解决的问题,剩下的交给时间。',
  '写代码和写文章一样,删掉一半,通常更好。',
  '清风徐来,水波不兴。',
  'Debug 的乐趣在于:它藏得越深,找到时越爽。',
  '人生苦短,我用 Python。',
  '好的代码本身就是最好的文档。',
  '路漫漫其修远兮,吾将上下而求索。',
  '沉淀,是最好的投资。',
];

/** 友链:侧栏展示的友情链接 */
export const FRIEND_LINKS: { name: string; url: string; desc?: string }[] = [
  { name: 'Astro', url: 'https://astro.build', desc: '本站使用的框架' },
  { name: 'MDN', url: 'https://developer.mozilla.org', desc: '前端知识库' },
  { name: 'GitHub', url: 'https://github.com', desc: '代码托管平台' },
  { name: '掘金', url: 'https://juejin.cn', desc: '技术社区' },
];

/**
 * 音乐播放器:服务端抓取网络歌单(基于 Meting API)
 *
 * 换歌单只需要改 listId:
 *   - 网易云:打开歌单网页,地址栏 playlist?id=xxxxx 里的数字
 *   - 也支持 server: 'tencent' | 'kugou' | 'baidu'(对应平台的歌单 ID)
 *
 * apis: 抓取接口列表,按顺序尝试,前一个失败自动切换下一个。
 *       第一个默认能给到完整音轨;第二个是备用(部分歌曲只返回试听片段)。
 * limit: 最多抓取多少首,侧栏列表太长会影响体验(建议 50~120)。
 */
export const MUSIC = {
  enabled: true,
  /** 平台:netease / tencent / kugou / baidu */
  server: 'netease',
  /** 歌单 ID(默认:网易云热歌榜) */
  listId: '3778678',
  /** 歌单显示名(留空则用接口返回的名字) */
  listName: '网易云热歌榜',
  limit: 100,
  apis: [
    'https://api.qijieya.cn/meting/',
    'https://api.injahow.cn/meting/',
  ],
  /** 缓存时间(分钟):到期后重新抓取,避免每次刷首页都请求第三方 */
  cacheMinutes: 10,
};
