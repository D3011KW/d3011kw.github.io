export const 题型 = { single: '单选', multi: '多选', judge: '判断' }
export const 模式 = { seq: '顺序练习', random: '随机练习', exam: '模拟考试', wrong: '错题重练' }
export const 存储键 = 'zhixue-local-h5-v1'
export const 空记录 = () => ({ 练习: [], 错题: {} })
export const 已答数 = 练习 => 练习.题号.filter(编号 => 练习.作答[编号]?.length).length
export const 计时 = 秒数 => {
  const 秒 = Math.max(0, Math.floor(秒数))
  return [Math.floor(秒 / 60), 秒 % 60].map(数量 => String(数量).padStart(2, '0')).join(':')
}
export const 时间文字 = 时刻 => new Date(时刻).toLocaleString('zh-CN', {
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false
})

export function 读取记录(存储) {
  const 原文 = 存储.getItem(存储键)
  if (原文 === null) return 空记录()
  const 记录 = JSON.parse(原文)
  if (!Array.isArray(记录?.练习) || !记录.错题 || Array.isArray(记录.错题) || typeof 记录.错题 !== 'object') {
    throw new Error('本地记录无法读取')
  }
  return 记录
}

export function 修改记录(存储, 更新) {
  const 记录 = 读取记录(存储)
  更新(记录)
  存储.setItem(存储键, JSON.stringify(记录))
  return 记录
}

export function 清除记录(存储) {
  存储.removeItem(存储键)
  return 空记录()
}

export function 选出题目(题库, 设置, 错题) {
  const { 科目, 章节, 类型, 方式, 题数, 单题 } = 设置
  const 候选 = 题库.filter(题 => 题.科目 === 科目 && (!章节 || 题.章节 === 章节) &&
    (!单题 || 题.编号 === 单题) && (方式 === 'wrong' ? 错题[题.编号]?.保留 : 类型 === 'all' || 题.题型 === 类型))
  if (方式 === 'random' || 方式 === 'exam') {
    for (let 位置 = 候选.length - 1; 位置 > 0; 位置--) {
      const 随机位置 = Math.floor(Math.random() * (位置 + 1))
      ;[候选[位置], 候选[随机位置]] = [候选[随机位置], 候选[位置]]
    }
  }
  return 候选.slice(0, 题数).map(题 => 题.编号)
}

export function 判分(练习, 题目索引, 时刻) {
  const 明细 = 练习.题号.map(编号 => {
    const 题 = 题目索引.get(编号)
    const 作答 = 练习.作答[编号] || []
    const 答对 = new Set(作答).size === 题.答案.length &&
      题.答案.every(字母 => 作答.includes(字母))
    return { 编号, 答对 }
  })
  const 正确 = 明细.filter(题 => 题.答对).length
  const 总数 = 明细.length
  return {
    明细, 正确, 错误: 总数 - 正确, 得分: Math.round(正确 / 总数 * 100),
    交卷时间: 时刻,
    用时: Math.max(0, Math.floor((时刻 - 练习.开始时间) / 1000))
  }
}

export function 完成交卷(记录, 练习, 题目索引, 时刻) {
  if (练习.结果) return
  练习.结果 = 判分(练习, 题目索引, Math.min(时刻, 练习.截止时间 || 时刻))
  for (const { 编号, 答对 } of 练习.结果.明细) {
    if (!答对) {
      记录.错题[编号] = { 次数: (记录.错题[编号]?.次数 || 0) + 1, 最后时间: 时刻, 保留: true }
    }
  }
}

export function 练习统计(练习列表) {
  const 汇总 = { 次数: 0, 天数: 0, 正确率: 0, 今日总题: 0, 今日正确率: 0, 已练: new Set() }
  const 日期 = new Set()
  const 今天 = new Date().toDateString()
  let 总题 = 0, 总正确 = 0, 今日正确 = 0
  for (const 练习 of 练习列表) {
    if (!练习.结果) continue
    const 当天 = new Date(练习.结果.交卷时间).toDateString()
    const 题量 = 练习.题号.length
    日期.add(当天)
    汇总.次数++
    总题 += 题量
    总正确 += 练习.结果.正确
    练习.题号.forEach(编号 => 汇总.已练.add(编号))
    if (当天 === 今天) {
      汇总.今日总题 += 题量
      今日正确 += 练习.结果.正确
    }
  }
  汇总.天数 = 日期.size
  汇总.正确率 = 总题 ? Math.round(总正确 / 总题 * 100) : 0
  汇总.今日正确率 = 汇总.今日总题 ? Math.round(今日正确 / 汇总.今日总题 * 100) : 0
  return 汇总
}
