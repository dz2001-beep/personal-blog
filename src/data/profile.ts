/**
 * 个人 Profile 数据 —— 修改这里即可更新「关于我」页面
 */

export const PROFILE = {
  /** 姓名 */
  name: 'DZ-Vanguard',
  /** 英文名 / ID(可选) */
  handle: 'DZ-Vanguard',
  /** 职位头衔 */
  title: '全栈工程师',
  /** 一句话定位 */
  tagline: '写代码、写文章、做开源。',
  /** 个人简介(支持 Markdown 语法,换行用 \n\n) */
  bio: `你好,我是**DZ-Vanguard**,一名热爱技术的前端/全栈工程师。

这个博客用来记录我的技术思考、踩坑经验与开源作品。我相信最好的学习方式是输出 —— 把遇到的问题和解决方案写下来,既帮助自己沉淀,也希望能帮到同样在路上的你。

平时主要使用 TypeScript / React / Node.js 等技术栈,对工程化、性能优化和开发者体验感兴趣。工作之余喜欢折腾开源项目、读技术书、偶尔写写随笔。`,
  /** 工作经历(最新的放最前面) */
  experience: [
    {
      period: '2022 - 至今',
      company: '某科技有限公司',
      role: '高级前端工程师',
      desc: '负责核心业务的前端架构设计,主导工程化改造与性能优化,页面首屏时间降低 40%。',
    },
    {
      period: '2020 - 2022',
      company: '某互联网公司',
      role: '前端工程师',
      desc: '负责多个中后台与 C 端项目的开发与维护,参与组件库建设与 CI/CD 流程优化。',
    },
    {
      period: '2018 - 2020',
      company: '某创业公司',
      role: '实习 / 初级开发',
      desc: '从实习转正,独立负责小程序端从 0 到 1 的开发与上线。',
    },
  ],
  /** 教育背景 */
  education: [
    {
      period: '2014 - 2018',
      school: '某大学',
      major: '计算机科学与技术 · 本科',
      desc: '',
    },
  ],
  /** 技术栈(支持分组) */
  skills: [
    {
      group: '语言',
      items: ['TypeScript', 'JavaScript', 'Python', 'Go'],
    },
    {
      group: '前端',
      items: ['React', 'Vue', 'Astro', 'Tailwind CSS', 'Vite'],
    },
    {
      group: '后端',
      items: ['Node.js', 'Express', 'NestJS', 'PostgreSQL', 'Redis'],
    },
    {
      group: '工程化',
      items: ['Git', 'Docker', 'CI/CD', 'Linux'],
    },
  ],
};
