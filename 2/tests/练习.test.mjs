import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  选出题目, 判分, 完成交卷, 练习统计, 空记录, 修改记录, 读取记录, 清除记录, 存储键
} from '../逻辑/练习.mjs'

const 题库 = JSON.parse(readFileSync(new URL('../数据/题目.json', import.meta.url)))
const 科目表 = JSON.parse(readFileSync(new URL('../数据/科目.json', import.meta.url)))
const 索引 = new Map(题库.map(题 => [题.编号, 题]))
const 题号 = 题库.filter(题 => 题.科目 === 'cet46').map(题 => 题.编号)
const 现在 = Date.now()
const 示例练习 = () => ({ 题号, 开始时间: 现在 - 8500, 作答: {
  [题号[0]]: ['B'], [题号[1]]: ['B', 'A']
} })

test('内置题库科目、章节、选项和答案引用有效', () => {
  assert.equal(科目表.length, 12)
  assert.equal(题库.length, 36)
  assert.equal(索引.size, 36)
  for (const 题 of 题库) {
    assert.ok(科目表.find(项 => 项.编号 === 题.科目)?.章节.some(章 => 章.编号 === 题.章节))
    assert.ok(题.答案.length && 题.答案.every(字母 => 题.选项.some(选项 => 选项.字母 === 字母)))
  }
})

test('按科目、题型和错题状态选题，题量不超过实际匹配数量', () => {
  const 设置 = { 科目: 'cet46', 章节: 'cet46-demo', 类型: 'all', 方式: 'seq', 题数: 30 }
  assert.deepEqual(选出题目(题库, 设置, {}), 题号)
  assert.deepEqual(选出题目(题库, { ...设置, 类型: 'multi' }, {}), [题号[1]])
  assert.deepEqual(选出题目(题库, { ...设置, 方式: 'wrong' }, { [题号[0]]: { 保留: false }, [题号[1]]: { 保留: true } }), [题号[1]])
  assert.deepEqual(选出题目(题库, { ...设置, 方式: 'random' }, {}).sort(), [...题号].sort())
})

test('多选顺序不限，少选或多选不计分，未答计错', () => {
  const 样例 = 示例练习()
  assert.equal(判分(样例, 索引, 现在).得分, 67)
  样例.作答[题号[1]] = ['A']
  assert.equal(判分(样例, 索引, 现在).得分, 33)
  样例.作答[题号[1]] = ['A', 'B', 'C']
  assert.equal(判分(样例, 索引, 现在).得分, 33)
})

test('交卷不重复累计错题，统计排除未提交草稿', () => {
  const 记录 = 空记录()
  const 样例 = { ...示例练习(), 截止时间: 现在 - 1000 }
  完成交卷(记录, 样例, 索引, 现在)
  完成交卷(记录, 样例, 索引, 现在 + 1000)
  assert.equal(记录.错题[题号[2]].次数, 1)
  assert.equal(样例.结果.交卷时间, 现在 - 1000)
  const 结果 = 练习统计([样例, 示例练习(), { ...样例 }])
  assert.deepEqual([结果.次数, 结果.天数, 结果.正确率], [2, 1, 67])
})

test('本地记录读写正常；清空只移除平台存储键', () => {
  const 数据 = new Map([['其他应用', '保留']])
  const 存储 = {
    getItem: 键 => 数据.get(键) ?? null,
    setItem: (键, 值) => 数据.set(键, 值),
    removeItem: 键 => 数据.delete(键)
  }
  修改记录(存储, 记录 => 记录.练习.push(示例练习()))
  assert.equal(读取记录(存储).练习.length, 1)
  数据.set(存储键, '{坏数据')
  assert.throws(() => 修改记录(存储, () => {}))
  assert.equal(数据.get(存储键), '{坏数据')
  清除记录(存储)
  assert.deepEqual(读取记录(存储), 空记录())
  assert.equal(数据.get('其他应用'), '保留')
})

test('交付源码不调用浏览器原生提示、确认与输入弹窗', () => {
  const 项目根 = fileURLToPath(new URL('..', import.meta.url))
  const 源码文件 = 目录 => readdirSync(目录, { withFileTypes: true }).flatMap(条目 => {
    const 路径 = join(目录, 条目.name)
    if (条目.isDirectory()) return ['.git', 'unpackage', 'tests', 'node_modules'].includes(条目.name) ? [] : 源码文件(路径)
    return /\.(vue|js|mjs|html)$/.test(条目.name) ? [路径] : []
  })
  for (const 路径 of 源码文件(项目根)) {
    assert.doesNotMatch(readFileSync(路径, 'utf8'), /\b(?:alert|confirm|prompt)\s*\(/, 路径)
  }
})
