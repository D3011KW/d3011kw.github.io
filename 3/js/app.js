// 应用主逻辑（由原 pages/index/index.vue 的 <script setup> 平移为 Vue 全局构建版）
const L = window.练习

Vue.createApp({
  data() {
    return {
      题型: L.题型,
      模式: L.模式,
      图标: {
        首页: '\ue662', 错题本: '\ue67f', 个人中心: '\ue699', 搜索: '\ue654',
        返回: '\ue6b7', 前进: '\ue6b5', 标记: '\ue65f', 历史: '\ue6a0', 题库: '\ue644'
      },
      导航: ['首页', '错题本', '个人中心'].map(名称 => ({ 名称 })),
      页面标题: { 首页: '知学刷题平台', 错题本: '我的错题', 答题: '正在答题' },
      页面: '首页',
      错误: '',
      提示: '',
      记录: L.空记录(),
      读取失败: false,
      关键词: '',
      已搜索: '',
      筛选科目: '',
      页数: 1,
      科目编号: '',
      练习方式: 'seq',
      选择题型: 'all',
      题量: 8,
      练习编号: '',
      解析位置: 0,
      当前时间: Date.now(),
      弹窗: { 标题: '', 说明: '', 按钮: '', 危险: false }
    }
  },

  computed: {
    题目索引() { return new Map(window.题库.map(题 => [题.编号, 题])) },
    科目索引() { return new Map(window.科目资料.map(项 => [项.编号, 项.名称])) },
    分类() { return [...new Set(window.科目资料.map(项 => 项.分类))] },
    统计() { return L.练习统计(this.记录.练习) },
    科目() {
      return window.科目资料.map(项目 => {
        const 科目题 = window.题库.filter(题 => 题.科目 === 项目.编号)
        const 计算题量 = 题组 => ({
          总题: 题组.length,
          已练: 题组.filter(题 => this.统计.已练.has(题.编号)).length
        })
        return {
          ...项目,
          ...计算题量(科目题),
          章节: 项目.章节.map(章 => ({ ...章, ...计算题量(科目题.filter(题 => 题.章节 === 章.编号)) }))
        }
      })
    },
    当前科目() { return this.科目.find(项 => 项.编号 === this.科目编号) },
    最近草稿() { return this.记录.练习.find(项 => !项.结果) },
    不能清空() { return !this.记录.练习.length && !Object.keys(this.记录.错题).length && !this.读取失败 },
    当前练习() { return this.记录.练习.find(项 => 项.编号 === this.练习编号) },
    位置() { return this.页面 === '答案解析' ? this.解析位置 : (this.当前练习 && this.当前练习.位置 || 0) },
    当前题目() { return this.题目索引.get(this.当前练习 && this.当前练习.题号[this.位置]) },
    当前选项() { return (this.当前练习 && this.当前练习.作答[this.当前题目 && this.当前题目.编号]) || [] },
    当前明细() { return this.当前练习 && this.当前练习.结果 && this.当前练习.结果.明细[this.位置] },
    答题计时() {
      const p = this.当前练习
      if (!p) return '00:00'
      return L.计时(((p.截止时间 || this.当前时间) - (p.截止时间 ? this.当前时间 : p.开始时间)) / 1000)
    },
    错题列表() {
      return Object.entries(this.记录.错题)
        .filter(([编号, 错题]) => 错题.保留 && this.题目索引.has(编号))
        .sort((左, 右) => 右[1].最后时间 - 左[1].最后时间)
        .map(([编号]) => this.题目索引.get(编号))
    },
    列表() {
      if (this.页面 === '错题本') return this.错题列表.filter(题 => !this.筛选科目 || 题.科目 === this.筛选科目)
      if (this.页面 === '练习记录') return this.记录.练习
      return window.题库.filter(题 => [题.题干, this.科目名称(题.科目), ...题.标签].some(文字 => 文字.toLowerCase().includes(this.已搜索)))
    }
  },

  methods: {
    科目名称(编号) { return this.科目索引.get(编号) || '其他科目' },
    已答数(练习) { return L.已答数(练习) },
    计时(秒数) { return L.计时(秒数) },
    时间文字(时刻) { return L.时间文字(时刻) },

    键盘操作(事件) {
      const 按钮 = event.target
      if (按钮.tagName !== 'BUTTON' || 按钮.hasAttribute('disabled') || event.repeat) return
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        按钮.click()
      }
    },

    刷新记录() {
      try {
        this.记录 = L.读取记录(window.localStorage)
        this.读取失败 = false
        this.错误 = ''
        return true
      } catch {
        this.读取失败 = true
        this.错误 = '无法读取本地记录。请检查浏览器是否允许本站存储，或在个人中心清空损坏的本地记录。'
        return false
      }
    },

    保存(操作) {
      try {
        this.记录 = L.修改记录(window.localStorage, 操作)
        this.错误 = ''
        return true
      } catch {
        this.错误 = '未能保存本次操作。请检查浏览器的站点存储权限和可用空间，再重试。'
        return false
      }
    },

    切换页面(名称) {
      this.页面 = 名称
      this.提示 = ''
      this.页数 = 1
      if (名称 === '错题本') this.筛选科目 = ''
      this.刷新记录()
      window.scrollTo(0, 0)
    },

    搜索() {
      const 原词 = this.$refs.搜索输入 ? this.$refs.搜索输入.value : this.关键词
      const 输入 = (原词 || '').trim().toLowerCase()
      if (!输入) { this.提示 = '请输入题干、科目或知识点。'; return }
      this.已搜索 = 输入
      this.切换页面('搜索题目')
    },

    选择科目(项目) {
      this.科目编号 = 项目.编号
      this.练习方式 = 'seq'
      this.选择题型 = 'all'
      this.题量 = Math.min(8, 项目.总题) || 1
      this.切换页面('科目题库')
    },

    开始练习(设置) {
      this.提示 = ''
      const 当前题量 = this.$refs.题量输入 ? this.$refs.题量输入.value : this.题量
      const 选题 = { 方式: this.练习方式, 类型: this.选择题型, 题数: Number(当前题量), ...设置 }
      if (!Number.isInteger(选题.题数) || 选题.题数 < 1 || 选题.题数 > 30) {
        this.提示 = '本次题数请输入 1 到 30 的整数。'
        return
      }
      if (!this.刷新记录()) return
      const 题号 = L.选出题目(window.题库, 选题, this.记录.错题)
      if (!题号.length) {
        this.提示 = 选题.方式 === 'wrong' ? '没有可重练的错题。' : '没有匹配的题目，请换一种题型。'
        return
      }
      const 开始时间 = Date.now()
      const 编号 = 开始时间 + '-' + Math.random().toString(36).slice(2)
      const 新练习 = {
        编号, 科目: 选题.科目, 方式: 选题.方式, 题号, 开始时间,
        截止时间: 选题.方式 === 'exam' ? 开始时间 + 120 * 60 * 1000 : 0,
        位置: 0, 作答: {}, 标记: [], 结果: null
      }
      if (this.保存(资料 => 资料.练习.unshift(新练习))) this.打开练习(编号)
    },

    打开练习(编号) {
      if (!this.刷新记录()) return
      if (!this.记录.练习.some(项 => 项.编号 === 编号)) { this.提示 = '这次练习已不存在。'; return }
      this.练习入口 = this.页面
      this.练习编号 = 编号
      this.当前时间 = Date.now()
      this.切换页面(this.当前练习.结果 ? '练习结果' : '答题')
      this.检查考试时间()
    },

    修改当前练习(更新) {
      return this.保存(资料 => {
        const 练习 = 资料.练习.find(项 => 项.编号 === this.练习编号)
        if (!练习) throw new Error('找不到练习')
        if (!练习.结果) 更新(练习, 资料)
      })
    },

    检查考试时间() {
      const 练习 = this.当前练习
      if (this.页面 !== '答题' || !练习 || !练习.截止时间 || Date.now() < 练习.截止时间) return false
      if (this.错误) return true
      this.交卷(true)
      return true
    },

    选择答案(字母) {
      if (this.页面 !== '答题' || this.检查考试时间()) return
      const { 编号, 题型: 类型 } = this.当前题目
      this.修改当前练习(练习 => {
        const 原选项 = 练习.作答[编号] || []
       练习.作答[编号] = 类型 !== 'multi' ? [字母] :
         原选项.includes(字母) ? 原选项.filter(项 => 项 !== 字母) : [...原选项, 字母]
      })
    },

    选项样式(字母) {
      const 已选 = this.当前选项.includes(字母)
      if (this.页面 === '答题') return { chosen: 已选 }
      const 正确 = this.当前题目.答案.includes(字母)
      return { correct: 正确, incorrect: 已选 && !正确 }
    },

    切换标记() {
      if (this.检查考试时间()) return
      const 编号 = this.当前题目.编号
      this.修改当前练习(练习 => {
        练习.标记 = 练习.标记.includes(编号) ? 练习.标记.filter(项 => 项 !== 编号) : [...练习.标记, 编号]
      })
    },

    跳题(序号) {
      if (this.检查考试时间() || 序号 < 0 || 序号 >= this.当前练习.题号.length) return
      if (this.修改当前练习(练习 => { 练习.位置 = 序号 })) window.scrollTo(0, 0)
    },

    请求交卷() {
      const 未答 = this.当前练习.题号.length - this.已答数(this.当前练习)
      if (!未答 || (this.当前练习.截止时间 && Date.now() >= this.当前练习.截止时间)) { this.交卷(); return }
      this.请求确认('确认交卷', '还有 ' + 未答 + ' 道题未作答，交卷后将按答错计入。', '确认交卷', () => this.交卷())
    },

    交卷(到时) {
      if (this.修改当前练习((练习, 资料) => L.完成交卷(资料, 练习, this.题目索引, Date.now()))) {
        this.关闭答题卡()
        this.关闭确认()
        this.切换页面('练习结果')
        if (到时) this.提示 = '考试时间已到，已按保存的答案交卷。'
      }
    },

    查看解析(序号) {
      if (序号 < 0 || 序号 >= this.当前练习.题号.length) return
      this.解析位置 = 序号
      this.切换页面('答案解析')
    },

    返回() {
      if (this.页面 === '答案解析') this.切换页面('练习结果')
      else if (['答题', '练习结果'].includes(this.页面)) this.切换页面(this.练习入口)
      else if (this.页面 === '练习记录') this.切换页面('个人中心')
      else this.切换页面('首页')
    },

    打开答题卡() { document.getElementById('答题卡弹窗').showModal() },
    关闭答题卡() { const d = document.getElementById('答题卡弹窗'); if (d && d.open) d.close() },
    关闭确认() { const d = document.getElementById('确认弹窗'); if (d && d.open) d.close() },

    async 请求确认(标题, 说明, 按钮, 动作, 危险) {
      Object.assign(this.弹窗, { 标题, 说明, 按钮, 危险: !!危险 })
      this.确认动作 = 动作
      await this.$nextTick()
      document.getElementById('确认弹窗').showModal()
      document.getElementById('取消操作').focus()
    },

    执行确认() {
      const 动作 = this.确认动作
      this.关闭确认()
      if (typeof 动作 === 'function') 动作()
    },

    移出错题(题) {
      this.请求确认('移出错题本', '将移出「' + 题.题干 + '」，不影响已保存的练习成绩。', '移出错题', () => {
        if (this.保存(资料 => { if (资料.错题[题.编号]) 资料.错题[题.编号].保留 = false })) this.提示 = '已移出错题本。'
      }, true)
    },

    确认清空() {
      this.请求确认('清空本地记录', '将删除当前浏览器中的全部练习、错题和未交卷进度，无法撤销。题库不会删除。', '确认清空', () => {
        try {
          this.记录 = L.清除记录(window.localStorage)
          this.读取失败 = false
          this.错误 = ''
          this.提示 = '本地记录已清空。'
        } catch {
          this.错误 = '未能清空，请检查浏览器的站点存储权限后重试。'
        }
      }, true)
    },

    同步其他标签页(事件) {
      if (event.key !== null && event.key !== L.存储键) return
      if (!this.刷新记录() || !['答题', '练习结果', '答案解析'].includes(this.页面)) return
      if (!this.当前练习) { this.关闭答题卡(); this.关闭确认(); this.切换页面('首页') }
      else if (this.当前练习.结果 && this.页面 === '答题') {
        this.关闭答题卡(); this.关闭确认(); this.切换页面('练习结果')
      }
    }
  },

  created() {
    this.确认动作 = null
    this.练习入口 = '首页'
    this.定时器 = null
  },

  mounted() {
    this.刷新记录()
    document.addEventListener('keydown', this.键盘操作)
    window.addEventListener('storage', this.同步其他标签页)
    this.定时器 = setInterval(() => { this.当前时间 = Date.now(); this.检查考试时间() }, 1000)
  },

  unmounted() {
    clearInterval(this.定时器)
    document.removeEventListener('keydown', this.键盘操作)
    window.removeEventListener('storage', this.同步其他标签页)
  }
}).mount('#app')
