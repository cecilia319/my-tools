// 健身小助手数据文件（唯一数据源：HTML读展示，定时任务读算推荐，会话写更新）
// 记录格式(records): {date:'YYYY-MM-DD', time:'HH:MM'(打卡时间), type:'模块'（多个用+连接）, minutes:30, intensity:1-10, note:'训练内容详记'}
// 记录格式(meals):   {date:'YYYY-MM-DD', period:'早'|'午'|'晚'|'加餐'|'夜宵', time:'HH:MM'(精确时间), what:'具体吃了什么(可选)'}
// 说明: 从 v2 起页面会把记录实时写入 localStorage 并同步回本文件; meals 由"餐别+精确时间+吃什么"构成, 支持一天多餐。
var FITNESS_DATA = {
  version: 2,
  records: [
  {date:'2026-10-28', time:'20:00', type:'臀腿力量', minutes:20, intensity:6, note:'史密斯箱式深蹲30kg 3×12；臀推30kg 3×12；哑铃单腿10kg 2×10。全程20分钟，下肢臀腿日。'}],
  meals: [],
  prefs: { defaultDuration: 40, defaultIntensity: 'normal' }
};