<template>
  <view class="mobile-app">
    <view class="mobile-header row between">
      <view class="row grow">
        <text v-if="页面 === '首页'" class="brand-mark">知</text>
        <button v-else-if="!导航.some(项目 => 项目.名称 === 页面)" class="icon-btn" role="button" tabindex="0" aria-label="返回" @click="返回"><text class="图标" aria-hidden="true">{{ 图标.返回 }}</text></button>
        <text class="title">{{ 页面标题[页面] || 页面 }}</text>
      </view>
      <text v-if="页面 === '答题'" class="small blue strong">{{ 当前练习.截止时间 ? '剩余' : '用时' }} {{ 答题计时 }}</text>
      <text v-if="页面 === '答案解析'" class="small muted">{{ 位置 + 1 }} / {{ 当前练习.题号.length }}</text>
    </view>
    <view v-if="页面 === '答题'" class="progress"><view class="progress-fill" :style="{ width: (位置 + 1) / 当前练习.题号.length * 100 + '%' }"></view></view>
    <view class="mobile-content" :class="{ 'quiz-content': ['答题', '答案解析'].includes(页面) }">
      <view v-if="错误" class="error-box" role="alert">{{ 错误 }}</view>
      <view v-if="提示" class="notice mb" role="status">{{ 提示 }}</view>

      <template v-if="页面 === '首页' || 页面 === '搜索题目'">
        <view class="search-bar">
          <text class="图标 muted" aria-hidden="true">{{ 图标.搜索 }}</text>
          <input ref="搜索输入" v-model="关键词" aria-label="题目、科目或知识点" placeholder="搜索题目、科目或知识点" confirm-type="search" @confirm="搜索">
          <button class="text-btn" role="button" tabindex="0" @click="搜索">搜索</button>
        </view>
      </template>
      <template v-if="页面 === '首页'">
        <view class="home-resume card">
          <view class="small muted">{{ 最近草稿 ? '继续上次练习' : '开始今天的练习' }}</view>
          <view class="h3">{{ 最近草稿 ? 科目名称(最近草稿.科目) : '选一科，开始刷题' }}</view>
          <view v-if="最近草稿" class="row between">
            <text class="small muted">已答 {{ 已答数(最近草稿) }} / {{ 最近草稿.题号.length }} 题</text>
            <button class="btn primary sm" role="button" tabindex="0" @click="打开练习(最近草稿.编号)">继续答题</button>
          </view>
          <view v-else class="small muted">选下方题库，交卷后查看答案与解析。</view>
        </view>
        <view class="home-stats">
          <view class="card"><view class="small muted">今日刷题</view><view class="stat-value">{{ 统计.今日总题 }}<text> 题</text></view></view>
          <view class="card"><view class="small muted">正确率</view><view class="stat-value">{{ 统计.今日正确率 }}<text> %</text></view></view>
          <button class="card" role="button" tabindex="0" @click="切换页面('错题本')"><view class="small muted">待巩固错题</view><view class="stat-value red">{{ 错题列表.length }}<text> 道 ›</text></view></button>
        </view>
        <view class="section-title"><text class="h2 serif">题库分类</text><text class="small muted">{{ 分类.length }} 大类 · {{ 科目.length }} 个科目</text></view>
        <view v-for="类别 in 分类" :key="类别" class="home-category">
          <view class="small muted">{{ 类别 }}</view>
          <view class="home-subject-grid">
            <button v-for="subject in 科目.filter(项 => 项.分类 === 类别)" :key="subject.编号" class="card home-subject" role="button" tabindex="0" @click="选择科目(subject)">
              <view>{{ subject.名称 }}</view><view class="small muted">{{ subject.总题 }} 题 · 已练 {{ subject.总题 ? Math.round(subject.已练 / subject.总题 * 100) : 0 }}%</view>
            </button>
          </view>
        </view>
      </template>

      <template v-else-if="页面 === '科目题库'">
        <view class="eyebrow">本地题库</view><view class="h1 serif">{{ 当前科目.名称 }}</view>
        <view class="small muted">{{ 当前科目.总题 }} 道题 · 已练 {{ 当前科目.已练 }} 题</view>
        <view class="section-title"><text class="h3">选择练习模式</text></view>
        <view class="mode-grid">
          <button v-for="(label, mode) in 模式" :key="mode" class="mode-card" :class="{ active: 练习方式 === mode }" role="button" tabindex="0" :aria-pressed="练习方式 === mode" @click="练习方式 = mode">{{ label }}</button>
        </view>
        <view class="notice mt">{{ 练习方式 === 'exam' ? '模拟考试限时 120 分钟，到时按已保存答案交卷。' : 练习方式 === 'wrong' ? '从本科目错题本选题，重新巩固。' : '进度自动保存在当前浏览器，可以随时回来继续。' }}</view>
        <view class="section-title"><text class="h3">题型与题量</text></view>
        <view class="chips">
          <button v-for="(label, kind) in { all: '全部题型', ...题型 }" :key="kind" class="chip" :class="{ active: (练习方式 === 'wrong' ? 'all' : 选择题型) === kind }" :disabled="练习方式 === 'wrong'" :aria-disabled="练习方式 === 'wrong'" role="button" tabindex="0" @click="选择题型 = kind">{{ label }}</button>
        </view>
        <view class="row between mb"><text>本次题数（1–30）</text><input ref="题量输入" v-model="题量" class="input 题量" type="number" aria-label="本次题数"></view>
        <button class="btn primary full" role="button" tabindex="0" @click="开始练习({ 科目: 当前科目.编号 })">开始练习</button>
        <view class="section-title"><text class="h2 serif">章节目录</text><text class="small muted">{{ 当前科目.章节.length }} 章</text></view>
        <view v-for="chapter in 当前科目.章节" :key="chapter.编号" class="chapter row">
          <view class="grow"><view class="strong">{{ chapter.名称 }}</view><view class="small muted">已练 {{ chapter.已练 }} / {{ chapter.总题 }} 题</view></view>
          <button class="text-btn" :disabled="!chapter.总题" :aria-disabled="!chapter.总题" role="button" tabindex="0" @click="开始练习({ 科目: 当前科目.编号, 章节: chapter.编号, 方式: 'seq', 类型: 'all' })">去练习</button>
        </view>
      </template>

      <template v-else-if="['答题', '答案解析'].includes(页面) && 当前题目">
        <view class="question-meta">
          <text class="tag blue">{{ 题型[当前题目.题型] }}</text>
          <text v-if="页面 === '答题'" class="tag">{{ 当前题目.难度 }}</text>
          <text v-else class="tag" :class="当前明细.答对 ? 'green' : 'red'">{{ 当前明细.答对 ? '回答正确' : 当前选项.length ? '回答错误' : '未作答' }}</text>
          <text class="grow"></text><text v-if="页面 === '答题'" class="small muted">{{ 位置 + 1 }} / {{ 当前练习.题号.length }}</text>
        </view>
        <view v-if="页面 === '答题'" class="small muted mb">{{ 科目名称(当前题目.科目) }} · {{ 模式[当前练习.方式] }}</view>
        <view class="question-stem">{{ 当前题目.题干 }}</view>
        <view class="options">
          <button v-for="option in 当前题目.选项" :key="option.字母" class="option" :class="选项样式(option.字母)" :disabled="页面 !== '答题'" :aria-disabled="页面 !== '答题'" :aria-pressed="当前选项.includes(option.字母)" role="button" tabindex="0" @click="选择答案(option.字母)">
            <text class="option-key">{{ option.字母 }}</text><text class="option-copy">{{ option.内容 }}</text>
            <text v-if="页面 === '答案解析' && 当前题目.答案.includes(option.字母)" class="option-status" aria-label="正确选项">✓</text>
          </button>
        </view>
        <template v-if="页面 === '答题'">
          <view class="small muted mt">{{ 当前题目.题型 === 'multi' ? '多选题：全部匹配才得分。' : '请选择一个正确选项。' }}</view>
          <view class="row between mt">
            <button class="text-btn" :class="{ orange: 当前练习.标记.includes(当前题目.编号) }" role="button" tabindex="0" @click="切换标记"><text class="图标" aria-hidden="true">{{ 图标.标记 }}</text> {{ 当前练习.标记.includes(当前题目.编号) ? '已标记' : '标记此题' }}</button>
            <text v-if="!错误" class="tiny muted">进度保存在本机</text>
          </view>
        </template>
        <template v-else>
          <view class="answer-summary"><text>正确答案 <text class="green strong">{{ 当前题目.答案.join('、') }}</text></text><text>你的答案 <text :class="当前明细.答对 ? 'green' : 'red'">{{ 当前选项.join('、') || '未答' }}</text></text></view>
          <view class="chips"><text v-for="标签 in 当前题目.标签" :key="标签" class="tag">{{ 标签 }}</text></view>
          <view class="review-block"><view class="h3 mb">题目解析</view><view class="解析内容">{{ 当前题目.解析 || '暂无题库解析。' }}</view></view>
        </template>
      </template>

      <template v-else-if="页面 === '练习结果' && 当前练习?.结果">
        <view class="text-center">
          <view class="score-ring"><text class="score">{{ 当前练习.结果.得分 }}</text><text class="small muted">本次得分</text></view>
          <view class="result-title serif">{{ 当前练习.结果.错误 ? '练习已完成' : '这次练习，全部答对' }}</view>
          <view class="small muted">{{ 科目名称(当前练习.科目) }} · {{ 模式[当前练习.方式] }}</view>
        </view>
        <view class="card stats mt">
          <view><view class="number green">{{ 当前练习.结果.正确 }}</view><view class="label">答对</view></view>
          <view><view class="number red">{{ 当前练习.结果.错误 }}</view><view class="label">答错 / 未答</view></view>
          <view><view class="number">{{ 计时(当前练习.结果.用时) }}</view><view class="label">本次用时</view></view>
        </view>
        <view class="section-title"><text class="h2 serif">答题情况</text><text class="small muted">点题号看解析</text></view>
        <view class="answer-grid"><button v-for="(detail, index) in 当前练习.结果.明细" :key="detail.编号" class="answer-cell" :class="detail.答对 ? 'correct' : 'incorrect'" :aria-label="'第 ' + (index + 1) + ' 题，' + (detail.答对 ? '答对' : '答错或未答')" role="button" tabindex="0" @click="查看解析(index)">{{ index + 1 }}</button></view>
        <view v-if="当前练习.结果.错误" class="notice">答错和未答的题目已自动加入错题本。</view>
        <button class="btn primary full mt" role="button" tabindex="0" @click="查看解析(0)">查看答案与解析</button>
        <button class="btn full mt" role="button" tabindex="0" @click="切换页面('首页')">返回首页</button>
      </template>

      <template v-else-if="['错题本', '练习记录', '搜索题目'].includes(页面)">
        <template v-if="页面 === '错题本'">
          <view class="eyebrow">LEARN FROM MISTAKES</view><view class="h1 serif">我的错题</view>
          <view class="small muted">把每个错因，变成下一次的把握。</view>
          <view class="chips">
            <button v-for="subject in [{ 编号: '', 名称: '全部科目' }, ...科目]" :key="subject.编号" class="chip" :class="{ active: 筛选科目 === subject.编号 }" role="button" tabindex="0" @click="筛选科目 = subject.编号; 页数 = 1">{{ subject.名称 }}</button>
          </view>
        </template>
        <template v-else-if="页面 === '练习记录'"><view class="h1 serif">练习记录</view><view class="small muted mb">查看结果，或继续还未交卷的练习。</view></template>
        <view class="row between mb">
          <text class="small muted">共 {{ 列表.length }} {{ 页面 === '练习记录' ? '次练习' : '道题' }}</text>
          <button v-if="页面 === '错题本'" class="text-btn" role="button" tabindex="0" @click="刷新记录">刷新</button>
        </view>
        <view v-if="!列表.length" class="empty">
          <text class="图标 空图标" aria-hidden="true">{{ 图标.题库 }}</text>
          <view class="h3">{{ 页面 === '搜索题目' ? '暂时没有匹配的题目' : '这里还没有记录' }}</view>
          <view class="small">{{ 页面 === '搜索题目' ? '试试科目名称或更短的关键词。' : '先完成一次练习，再回来看看。' }}</view>
          <button class="btn full mt" role="button" tabindex="0" @click="切换页面('首页')">去题库练习</button>
        </view>
        <view v-for="item in 列表.slice(0, 页数 * 15)" :key="item.编号" class="card list-question">
          <template v-if="页面 === '练习记录'">
            <view class="row between"><text class="h3">{{ 科目名称(item.科目) }}</text><text class="tag" :class="item.结果 ? 'green' : 'blue'">{{ item.结果 ? '已完成' : '进行中' }}</text></view>
            <view class="small muted mt">{{ 模式[item.方式] }} · {{ 时间文字(item.开始时间) }}</view>
            <view class="row between mt">
              <text class="small">{{ item.结果 ? item.结果.得分 + ' 分 · 答对 ' + item.结果.正确 + '/' + item.题号.length + ' 题' : '已答 ' + 已答数(item) + '/' + item.题号.length + ' 题' }}</text>
              <button class="text-btn" role="button" tabindex="0" @click="打开练习(item.编号)">{{ item.结果 ? '查看结果' : '继续练习' }}</button>
            </view>
          </template>
          <template v-else>
            <view class="row between"><text class="tag blue">{{ 题型[item.题型] }}</text><text class="tiny muted">{{ 科目名称(item.科目) }}</text></view>
            <view class="stem">{{ item.题干 }}</view>
            <view class="row between">
              <text v-if="页面 === '错题本'" class="small red">累计错 {{ 记录.错题[item.编号].次数 }} 次</text><text v-else class="small muted">{{ item.标签.join(' · ') }}</text>
              <button class="text-btn" role="button" tabindex="0" @click="开始练习({ 科目: item.科目, 单题: item.编号, 方式: 页面 === '错题本' ? 'wrong' : 'seq', 类型: 'all', 题数: 1 })">{{ 页面 === '错题本' ? '重练此题' : '练习此题' }}</button>
            </view>
            <view v-if="页面 === '错题本'" class="错题操作"><button class="text-btn muted" role="button" tabindex="0" @click="移出错题(item)">移出错题本</button></view>
          </template>
        </view>
        <button v-if="页数 * 15 < 列表.length" class="btn full" role="button" tabindex="0" @click="页数++">加载更多</button>
      </template>

      <template v-else-if="页面 === '个人中心'">
        <view class="card stats">
          <view><view class="number">{{ 统计.次数 }}</view><view class="label">累计练习</view></view>
          <view><view class="number">{{ 统计.天数 }}</view><view class="label">学习天数</view></view>
          <view><view class="number">{{ 统计.正确率 }}<text class="unit">%</text></view><view class="label">正确率</view></view>
        </view>
        <view class="menu-list">
          <button role="button" tabindex="0" @click="切换页面('错题本')"><text class="图标" aria-hidden="true">{{ 图标.错题本 }}</text><text class="grow">我的错题</text><text class="muted small">{{ 错题列表.length }}</text><text class="图标 muted" aria-hidden="true">{{ 图标.前进 }}</text></button>
          <button role="button" tabindex="0" @click="切换页面('练习记录')"><text class="图标" aria-hidden="true">{{ 图标.历史 }}</text><text class="grow">练习记录</text><text class="图标 muted" aria-hidden="true">{{ 图标.前进 }}</text></button>
        </view>
        <view class="notice">练习和错题仅保存在当前浏览器，不跨设备同步。</view>
        <button class="btn 危险文字 full mt" :disabled="不能清空" :aria-disabled="不能清空" role="button" tabindex="0" @click="确认清空">清空本地记录</button>
      </template>
    </view>

    <view v-if="导航.some(项目 => 项目.名称 === 页面)" class="bottom-tabs">
      <button v-for="tab in 导航" :key="tab.名称" class="导航按钮" :class="{ active: 页面 === tab.名称 }" :aria-current="页面 === tab.名称 ? 'page' : undefined" role="button" tabindex="0" @click="切换页面(tab.名称)"><text class="图标" aria-hidden="true">{{ 图标[tab.名称] }}</text><text>{{ tab.名称 }}</text></button>
    </view>
    <view v-if="页面 === '答题'" class="quiz-bar">
      <view class="row"><button class="text-btn" role="button" tabindex="0" @click="打开答题卡"><text class="图标" aria-hidden="true">{{ 图标.题库 }}</text> 答题卡 {{ 已答数(当前练习) }}/{{ 当前练习.题号.length }}</button></view>
      <view class="row">
        <button class="btn" :disabled="位置 === 0" :aria-disabled="位置 === 0" role="button" tabindex="0" @click="跳题(位置 - 1)">上一题</button>
        <button v-if="位置 < 当前练习.题号.length - 1" class="btn primary" role="button" tabindex="0" @click="跳题(位置 + 1)">下一题</button>
        <button v-else class="btn primary" role="button" tabindex="0" @click="请求交卷">交卷</button>
      </view>
    </view>
    <view v-if="页面 === '答案解析'" class="quiz-bar row">
      <button class="btn" :disabled="位置 === 0" :aria-disabled="位置 === 0" role="button" tabindex="0" @click="查看解析(位置 - 1)">上一题</button>
      <button class="btn" :disabled="位置 === 当前练习.题号.length - 1" :aria-disabled="位置 === 当前练习.题号.length - 1" role="button" tabindex="0" @click="查看解析(位置 + 1)">下一题</button>
    </view>

    <dialog id="答题卡弹窗" class="答题卡弹窗" aria-labelledby="答题卡标题">
      <view class="row between"><text id="答题卡标题" class="h2 serif">答题卡</text><button class="text-btn" role="button" tabindex="0" autofocus @click="关闭答题卡">关闭</button></view>
      <template v-if="当前练习 && 页面 === '答题'">
        <view class="small muted">已答 {{ 已答数(当前练习) }} / {{ 当前练习.题号.length }} · 橙点表示已标记</view>
        <view class="answer-grid">
          <button v-for="(questionId, index) in 当前练习.题号" :key="questionId" class="answer-cell" :class="{ answered: 当前练习.作答[questionId]?.length, current: 位置 === index, marked: 当前练习.标记.includes(questionId) }" role="button" tabindex="0" @click="跳题(index); 关闭答题卡()">{{ index + 1 }}</button>
        </view>
        <button class="btn primary full" role="button" tabindex="0" @click="关闭答题卡(); 请求交卷()">交卷并查看结果</button>
      </template>
    </dialog>
    <dialog id="确认弹窗" class="确认弹窗" aria-labelledby="确认标题" aria-describedby="确认说明" @close="确认动作 = null">
      <view id="确认标题" class="h2 serif">{{ 弹窗.标题 }}</view>
      <view id="确认说明" class="弹窗说明">{{ 弹窗.说明 }}</view>
      <view class="row between">
        <button id="取消操作" class="btn" role="button" tabindex="0" autofocus @click="关闭确认">取消</button>
        <button class="btn" :class="弹窗.危险 ? '危险按钮' : 'primary'" role="button" tabindex="0" @click="执行确认">{{ 弹窗.按钮 }}</button>
      </view>
    </dialog>
  </view>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import 科目资料 from '../../数据/科目.json'
import 题库 from '../../数据/题目.json'
import {
  题型, 模式, 存储键, 空记录, 读取记录, 修改记录, 清除记录, 选出题目,
  完成交卷, 练习统计, 已答数, 计时, 时间文字
} from '../../逻辑/练习.mjs'

const 图标 = {
  首页: '\ue662', 错题本: '\ue67f', 个人中心: '\ue699', 搜索: '\ue654',
  返回: '\ue6b7', 前进: '\ue6b5', 标记: '\ue65f', 历史: '\ue6a0', 题库: '\ue644'
}
const 导航 = ['首页', '错题本', '个人中心'].map(名称 => ({ 名称 }))
const 页面标题 = { 首页: '知学刷题平台', 错题本: '我的错题', 答题: '正在答题' }
const 页面 = ref('首页')
const 错误 = ref('')
const 提示 = ref('')
const 记录 = ref(空记录())
const 读取失败 = ref(false)
const 搜索输入 = ref(null)
const 题量输入 = ref(null)
const 关键词 = ref('')
const 已搜索 = ref('')
const 筛选科目 = ref('')
const 页数 = ref(1)
const 科目编号 = ref('')
const 练习方式 = ref('seq')
const 选择题型 = ref('all')
const 题量 = ref(8)
const 练习编号 = ref('')
const 解析位置 = ref(0)
const 当前时间 = ref(Date.now())
const 弹窗 = reactive({ 标题: '', 说明: '', 按钮: '', 危险: false })
let 确认动作 = null
let 练习入口 = '首页'
let 定时器

const 题目索引 = new Map(题库.map(题 => [题.编号, 题]))
const 科目索引 = new Map(科目资料.map(项 => [项.编号, 项.名称]))
const 分类 = [...new Set(科目资料.map(项 => 项.分类))]
const 科目名称 = 编号 => 科目索引.get(编号) || '其他科目'
const 统计 = computed(() => 练习统计(记录.value.练习))
const 科目 = computed(() => 科目资料.map(项目 => {
  const 科目题 = 题库.filter(题 => 题.科目 === 项目.编号)
  const 计算题量 = 题组 => ({ 总题: 题组.length, 已练: 题组.filter(题 => 统计.value.已练.has(题.编号)).length })
  return { ...项目, ...计算题量(科目题), 章节: 项目.章节.map(章 => ({ ...章, ...计算题量(科目题.filter(题 => 题.章节 === 章.编号)) })) }
}))
const 当前科目 = computed(() => 科目.value.find(项 => 项.编号 === 科目编号.value))
const 最近草稿 = computed(() => 记录.value.练习.find(项 => !项.结果))
const 不能清空 = computed(() => !记录.value.练习.length && !Object.keys(记录.value.错题).length && !读取失败.value)
const 当前练习 = computed(() => 记录.value.练习.find(项 => 项.编号 === 练习编号.value))
const 位置 = computed(() => 页面.value === '答案解析' ? 解析位置.value : 当前练习.value?.位置 || 0)
const 当前题目 = computed(() => 题目索引.get(当前练习.value?.题号[位置.value]))
const 当前选项 = computed(() => 当前练习.value?.作答[当前题目.value?.编号] || [])
const 当前明细 = computed(() => 当前练习.value?.结果?.明细[位置.value])
const 答题计时 = computed(() => 计时(((当前练习.value.截止时间 || 当前时间.value) -
  (当前练习.value.截止时间 ? 当前时间.value : 当前练习.value.开始时间)) / 1000))
const 错题列表 = computed(() => Object.entries(记录.value.错题)
  .filter(([编号, 错题]) => 错题.保留 && 题目索引.has(编号))
  .sort((左, 右) => 右[1].最后时间 - 左[1].最后时间)
  .map(([编号]) => 题目索引.get(编号)))
const 列表 = computed(() => {
  if (页面.value === '错题本') return 错题列表.value.filter(题 => !筛选科目.value || 题.科目 === 筛选科目.value)
  if (页面.value === '练习记录') return 记录.value.练习
  return 题库.filter(题 => [题.题干, 科目名称(题.科目), ...题.标签].some(文字 => 文字.toLowerCase().includes(已搜索.value)))
})

function 键盘操作(事件) {
  const 按钮 = 事件.target
  if (按钮.tagName !== 'UNI-BUTTON' || 按钮.hasAttribute('disabled') || 事件.repeat) return
  if (事件.key === 'Enter' || 事件.key === ' ') {
    事件.preventDefault()
    按钮.click()
  }
}

function 刷新记录() {
  try {
    记录.value = 读取记录(window.localStorage)
    读取失败.value = false
    错误.value = ''
    return true
  } catch {
    读取失败.value = true
    错误.value = '无法读取本地记录。请检查浏览器是否允许本站存储，或在个人中心清空损坏的本地记录。'
    return false
  }
}

function 保存(操作) {
  try {
    记录.value = 修改记录(window.localStorage, 操作)
    错误.value = ''
    return true
  } catch {
    错误.value = '未能保存本次操作。请检查浏览器的站点存储权限和可用空间，再重试。'
    return false
  }
}

function 切换页面(名称) {
  页面.value = 名称
  提示.value = ''
  页数.value = 1
  if (名称 === '错题本') 筛选科目.value = ''
  刷新记录()
  window.scrollTo(0, 0)
}

function 搜索() {
  const 原词 = 搜索输入.value?.$el.querySelector('input')?.value ?? 关键词.value
  const 输入 = 原词.trim().toLowerCase()
  if (!输入) { 提示.value = '请输入题干、科目或知识点。'; return }
  已搜索.value = 输入
  切换页面('搜索题目')
}

function 选择科目(项目) {
  科目编号.value = 项目.编号
  练习方式.value = 'seq'
  选择题型.value = 'all'
  题量.value = Math.min(8, 项目.总题) || 1
  切换页面('科目题库')
}

function 开始练习(设置) {
  提示.value = ''
  const 当前题量 = 题量输入.value?.$el.querySelector('input')?.value ?? 题量.value
  const 选题 = { 方式: 练习方式.value, 类型: 选择题型.value, 题数: Number(当前题量), ...设置 }
  if (!Number.isInteger(选题.题数) || 选题.题数 < 1 || 选题.题数 > 30) {
    提示.value = '本次题数请输入 1 到 30 的整数。'
    return
  }
  if (!刷新记录()) return
  const 题号 = 选出题目(题库, 选题, 记录.value.错题)
  if (!题号.length) {
    提示.value = 选题.方式 === 'wrong' ? '没有可重练的错题。' : '没有匹配的题目，请换一种题型。'
    return
  }
  const 开始时间 = Date.now()
  const 编号 = 开始时间 + '-' + Math.random().toString(36).slice(2)
  const 新练习 = {
    编号, 科目: 选题.科目, 方式: 选题.方式, 题号, 开始时间,
    截止时间: 选题.方式 === 'exam' ? 开始时间 + 120 * 60 * 1000 : 0,
    位置: 0, 作答: {}, 标记: [], 结果: null
  }
  if (保存(资料 => 资料.练习.unshift(新练习))) 打开练习(编号)
}

function 打开练习(编号) {
  if (!刷新记录()) return
  if (!记录.value.练习.some(项 => 项.编号 === 编号)) { 提示.value = '这次练习已不存在。'; return }
  练习入口 = 页面.value
  练习编号.value = 编号
  当前时间.value = Date.now()
  切换页面(当前练习.value.结果 ? '练习结果' : '答题')
  检查考试时间()
}

function 修改当前练习(更新) {
  return 保存(资料 => {
    const 练习 = 资料.练习.find(项 => 项.编号 === 练习编号.value)
    if (!练习) throw new Error('找不到练习')
    if (!练习.结果) 更新(练习, 资料)
  })
}

function 检查考试时间() {
  const 练习 = 当前练习.value
  if (页面.value !== '答题' || !练习?.截止时间 || Date.now() < 练习.截止时间) return false
  if (错误.value) return true
  交卷(true)
  return true
}

function 选择答案(字母) {
  if (页面.value !== '答题' || 检查考试时间()) return
  const { 编号, 题型: 类型 } = 当前题目.value
  修改当前练习(练习 => {
    const 原选项 = 练习.作答[编号] || []
    练习.作答[编号] = 类型 !== 'multi' ? [字母] :
      原选项.includes(字母) ? 原选项.filter(项 => 项 !== 字母) : [...原选项, 字母]
  })
}

function 选项样式(字母) {
  const 已选 = 当前选项.value.includes(字母)
  if (页面.value === '答题') return { chosen: 已选 }
  const 正确 = 当前题目.value.答案.includes(字母)
  return { correct: 正确, incorrect: 已选 && !正确 }
}

function 切换标记() {
  if (检查考试时间()) return
  const 编号 = 当前题目.value.编号
  修改当前练习(练习 => {
    练习.标记 = 练习.标记.includes(编号) ? 练习.标记.filter(项 => 项 !== 编号) : [...练习.标记, 编号]
  })
}

function 跳题(序号) {
  if (检查考试时间() || 序号 < 0 || 序号 >= 当前练习.value.题号.length) return
  if (修改当前练习(练习 => { 练习.位置 = 序号 })) window.scrollTo(0, 0)
}

function 请求交卷() {
  const 未答 = 当前练习.value.题号.length - 已答数(当前练习.value)
  if (!未答 || (当前练习.value.截止时间 && Date.now() >= 当前练习.value.截止时间)) { 交卷(); return }
  请求确认('确认交卷', '还有 ' + 未答 + ' 道题未作答，交卷后将按答错计入。', '确认交卷', () => 交卷())
}

function 交卷(到时 = false) {
  if (修改当前练习((练习, 资料) => 完成交卷(资料, 练习, 题目索引, Date.now()))) {
    关闭答题卡()
    关闭确认()
    切换页面('练习结果')
    if (到时) 提示.value = '考试时间已到，已按保存的答案交卷。'
  }
}

function 查看解析(序号) {
  if (序号 < 0 || 序号 >= 当前练习.value.题号.length) return
  解析位置.value = 序号
  切换页面('答案解析')
}

function 返回() {
  if (页面.value === '答案解析') 切换页面('练习结果')
  else if (['答题', '练习结果'].includes(页面.value)) 切换页面(练习入口)
  else if (页面.value === '练习记录') 切换页面('个人中心')
  else 切换页面('首页')
}

function 打开答题卡() { document.getElementById('答题卡弹窗').showModal() }
function 关闭答题卡() { document.getElementById('答题卡弹窗').close() }
function 关闭确认() { document.getElementById('确认弹窗').close() }

async function 请求确认(标题, 说明, 按钮, 动作, 危险 = false) {
  Object.assign(弹窗, { 标题, 说明, 按钮, 危险 })
  确认动作 = 动作
  await nextTick()
  document.getElementById('确认弹窗').showModal()
  document.getElementById('取消操作').focus()
}

function 执行确认() {
  const 动作 = 确认动作
  关闭确认()
  动作?.()
}

function 移出错题(题) {
  请求确认('移出错题本', '将移出「' + 题.题干 + '」，不影响已保存的练习成绩。', '移出错题', () => {
    if (保存(资料 => { if (资料.错题[题.编号]) 资料.错题[题.编号].保留 = false })) 提示.value = '已移出错题本。'
  }, true)
}

function 确认清空() {
  请求确认('清空本地记录', '将删除当前浏览器中的全部练习、错题和未交卷进度，无法撤销。题库不会删除。', '确认清空', () => {
    try {
      记录.value = 清除记录(window.localStorage)
      读取失败.value = false
      错误.value = ''
      提示.value = '本地记录已清空。'
    } catch {
      错误.value = '未能清空，请检查浏览器的站点存储权限后重试。'
    }
  }, true)
}

function 同步其他标签页(事件) {
  if (事件.key !== null && 事件.key !== 存储键) return
  if (!刷新记录() || !['答题', '练习结果', '答案解析'].includes(页面.value)) return
  if (!当前练习.value) { 关闭答题卡(); 关闭确认(); 切换页面('首页') }
  else if (当前练习.value.结果 && 页面.value === '答题') {
    关闭答题卡(); 关闭确认(); 切换页面('练习结果')
  }
}

onMounted(() => {
  刷新记录()
  document.addEventListener('keydown', 键盘操作)
  window.addEventListener('storage', 同步其他标签页)
  定时器 = setInterval(() => { 当前时间.value = Date.now(); 检查考试时间() }, 1000)
})
onUnmounted(() => {
  clearInterval(定时器)
  document.removeEventListener('keydown', 键盘操作)
  window.removeEventListener('storage', 同步其他标签页)
})
</script>
