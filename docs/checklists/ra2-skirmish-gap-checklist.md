<!-- This checklist is intentionally long because it is the exhaustive gap ledger against a full RA2 skirmish feature set. Keep it as one file so progress stays auditable in a single place. -->
# RA2 遭遇战差距总清单（Red Alert 2: Reborn）

> 目标：把当前项目推进到“可独立成立的、明显具有 RA2 遭遇战体验的原创 RTS”。
>
> 说明：`[x]` = 当前 repo 已有；`[ ]` = 尚未完成；`[~]` = 有雏形但离 RA2 水准还差明显一截。
>
> 基线评估时间：2026-04-10

---

## A. 当前已完成的基础能力

### A1. 核心 RTS 骨架
- [x] 地图、相机、基础地形、迷雾
- [x] 框选、点选、右键移动/攻击
- [x] 基础 A* 寻路
- [x] 自动交战 / 反击
- [x] AI 对手存在并能出兵

### A2. 经济与生产基础
- [x] Power Plant / Refinery / Barracks / War Factory
- [x] Soldier / Harvester / Rhino Tank
- [x] 矿车采矿 → 回矿 → 变现循环
- [x] 电力系统（产电 / 耗电 / low power / radar offline）
- [x] 前置建筑（prerequisites）
- [x] 生产队列
- [x] Repair / Sell / Rally Point 控制

### A3. 基础体验
- [x] 版本号和 git hash 显示
- [x] Vercel 部署与 hash 注入规则
- [x] E2E 基础回归

---

## B. 与 RA2 遭遇战相比仍缺失的全部功能

## B1. 开局与胜负规则
- [x] Construction Yard（基地车展开后的主基地）
- [x] MCV（移动基地车）与 deploy 机制
- [x] 以 MCV / Construction Yard 为核心的正式开局流程
- [x] 正式的遭遇战规则参数（starting credits、short/medium/long game）
- [x] 多出生点 / 真正的 spawn logic
- [~] 可配置的 skirmish 选项（已支持资金、地图、玩家阵营、AI 数量、AI 难度、AI build order 与游戏速度；多阵营席位/盟友设置仍未完成）
- [x] 更完整的失败条件（仅靠剩余单位苟活不够 RA2）
- [x] 胜利结算界面 / 战后统计

## B2. 阵营与科技树
- [ ] 真正的 Allied / Soviet 双阵营分化
- [ ] 双阵营独立建筑树
- [ ] 双阵营独立兵种树
- [ ] 阵营特有科技路线
- [ ] 阵营特有防御建筑
- [ ] 阵营特有超级武器
- [ ] 阵营专属视觉语言 / 配色 / 语音提示
- [ ] 子阵营（如美国、韩国、伊拉克、古巴等）风格差异

## B3. 建筑系统（经济 / 军事 / 科技 / 防御）
### B3.1 经济与基础设施
- [x] Power Plant
- [x] Advanced Power Plant
- [x] Refinery
- [x] Service Depot
- [ ] Ore Purifier / economy amplifiers（若采用 Yuri/扩展思路可选）
- [ ] 真正的电网 / 建筑停摆层级效果细化

### B3.2 步兵 / 载具 / 空军生产建筑
- [x] Barracks
- [x] War Factory
- [x] Airforce Command / Airfield
- [ ] Naval Yard

### B3.3 科技建筑
- [x] Radar / Radar Dome 作为独立建筑，而不是 power 状态文案
- [x] Battle Lab / tech center
- [ ] 机场 / 高科前置链
- [ ] 秘密实验室 / tech pickup 机制（可选）

### B3.4 防御建筑
- [x] Pillbox / Sentry Gun 级基础防御
- [~] Patriot / Flak Cannon / Tesla Coil / Prism Tower 等阵营防御（已补 Patriot Battery，其他阵营防御仍缺）
- [~] 防空建筑（已补 Patriot Battery 基础防空塔，更多阵营/层级仍未完成）
- [x] 围墙（Wall / Sandbag / Concrete Wall）
- [ ] 防御建筑供电 / 低电停摆逻辑细化

### B3.5 超级武器建筑
- [ ] Nuclear Missile Silo
- [ ] Weather Control Device
- [ ] Psychic Dominator（若包含 Yuri 系内容）
- [ ] 超级武器倒计时 UI
- [ ] 超级武器发射、预警、落点反馈

## B4. 单位 roster（当前极度不完整）
### B4.1 步兵
- [x] 基础 Rifle Infantry（Soldier）
- [x] Engineer
- [x] Attack Dog
- [x] Rocket Infantry / anti-armor infantry
- [x] Flak Trooper / anti-air infantry
- [ ] Spy
- [ ] Tanya / elite commando 类单位
- [ ] Desolator / Tesla Trooper / Chrono Legionnaire / GI 等特色单位
- [x] 兵种驻守建筑（garrison）
- [ ] 兵种趴下 / 部署 / 架设类行为（如 GI）

### B4.2 载具
- [x] Harvester
- [x] Rhino Tank
- [~] APC / IFV（已补 APC + 基础 IFV 防空车；APC 步兵装载 / 卸载与基础运输协同 AI 已补，但更复杂的多车编组 / 目标切换仍未完成）
- [x] Anti-air vehicle
- [x] Artillery / V3 / Siege 类远程单位
- [ ] Terror Drone / Mirage / Prism Tank / Apocalypse / Kirov 等特色载具
- [x] MCV
- [ ] Repair IFV / support vehicle（如需要）

### B4.3 空军
- [x] Harrier / Black Eagle（当前已补 Harrier）
- [ ] Helicopter / transport air
- [x] Air unit ammo / return-to-base / rearm 机制
- [x] 防空锁定与空袭反馈

### B4.4 海军
- [ ] Naval Yard 生产链
- [ ] Destroyer / Dreadnought / Submarine 等舰船
- [ ] 水域寻路与海战
- [ ] 海军对陆 / 对空规则

## B5. 经济系统（离 RA2 还差很多细节）
- [x] 矿车采矿与回矿
- [x] 矿车自动寻找最近安全矿区的策略优化（已补基于敌方威胁、矿场距离与矿区规模的选矿评分，矿车会绕开被敌军贴脸控制的近矿）
- [x] 矿车受袭逃跑 / AI 护矿逻辑（已完成 AI 护矿与骚扰矿车；矿车受袭会立刻缩回最近矿场并在威胁解除后恢复采矿）
- [x] 多矿区优先级（已补矿区总储量/残矿惩罚评分，不再机械吸附最近那一格残矿）
- [ ] 矿石与宝石（ore / gems）区分
- [ ] 不同资源价值
- [ ] 采矿动画 / 采矿反馈更明显
- [ ] 矿场耗尽后的地图观感变化加强
- [x] Service Depot 维修载具
- [ ] 更真实的建造与花费节奏平衡

## B6. 建造与生产体验
- [x] prerequisites
- [x] queue
- [x] repair / sell / rally
- [ ] 经典 sidebar build cameo 风格
- [ ] 建造进度条更像 RA2
- [ ] 多个生产建筑并行加速的可视化
- [x] waypoint / rally 可视化标记
- [x] 取消建造 / 取消训练并退款
- [ ] 拖拽排队 / 批量排队快捷键
- [ ] 建筑放置占地预览更像 RA2
- [ ] 低电时生产受限的 UI 提示更清晰
- [x] 建筑依赖链可视化（build 卡片现已显示 tech chain、下一步解锁项，并在点击锁定项时明确提示缺失前置）

## B7. 战斗系统
- [x] 基础伤害、射程、投射物、溅射
- [ ] 武器类型与护甲类型克制矩阵
- [ ] 反步兵 / 反甲 / 反空 / 反建筑差异化
- [ ] 开火音效与命中特效分型
- [ ] 爆炸大小 / 焦土 / 残骸
- [ ] 载具转向与炮塔旋转更真实
- [ ] 单位开火准备 / 攻击前摇 / 移动开火限制
- [ ] 友军误伤 / 溅射规则细化
- [ ] 维修中的建筑受击中断等状态逻辑
- [ ] 单位特殊技能 / 主动技能

## B8. 单位行为与微操
- [x] 右键移动 / 攻击
- [x] control groups
- [x] stance（guard / aggressive / hold ground，已补选择面板按钮 + G/A/H 快捷键，并让 Guard / Aggressive / Hold Ground 真正影响索敌半径与追击 leash）
- [x] force move / force fire / guard 等命令（已补 Force Move / Force Fire / Guard 选择面板按钮、Q / C / F 快捷键，以及 Ctrl+右键/Force Fire 对地强制开火与 Guard 友军护卫指令）
- [~] scatter / stop 命令（已补 Stop / Scatter / Force Fire / Force Move / Patrol 选择面板按钮与 S / X / C / F / P 快捷键；更完整的 guard / 阵型微操仍未做）
- [x] waypoints（已补 Shift+右键移动路径队列，队列会在自动交战后恢复并继续执行）
- [x] patrol
- [ ] 单位编队逻辑更像 RTS
- [ ] 载具碾压步兵
- [ ] 部署型单位 / 展开型单位
- [x] 工程师占建筑
- [x] 运输载具装载 / 卸载

## B9. veterancy / crate / map pickups
- [x] Veterancy（rookie / veteran / elite）
- [x] veterancy 带来的属性 / 开火变化
- [ ] 地图随机 crates
- [ ] crate 奖励（钱、修理、升级、爆炸等）
- [ ] 中立 tech building capture

## B10. 地图与场景
- [x] 基础地形 + 水域 + 矿区
- [x] 可玩的多张遭遇战地图
- [ ] 桥梁 / 可破坏桥梁
- [~] 建筑驻守点 / 城市地图元素（已补地图内中立 Battle Bunker + Civilian Block 驻守点，开始有城市街区争夺；更完整的城市建筑群、多样立面与桥梁仍未完成）
- [~] 中立建筑（已补可占领/可驻守的 Civilian Block 中立建筑，仍缺更多非驻守型地图中立设施）
- [ ] 地图装饰物（树、路灯、残骸、围栏、道路）
- [ ] 地表 decal / scorch mark / dirt variation
- [ ] 更完整的 tile variation
- [ ] 地图 script / expansion points
- [ ] 高地、 chokepoint、渡口等地图策略性

## B11. UI / UX（当前仍明显不像 RA2）
- [x] 顶栏、sidebar、minimap 基本存在
- [ ] 真正 RA2 风格的右侧命令栏布局
- [ ] 原创 cameo 取代当前 3D icon 主导方案
- [ ] 建筑控制面板更像经典 C&C 样式
- [ ] 小地图边框 / 雷达框 / ping 质感提升
- [ ] tooltip 更完整
- [ ] 生产来源建筑高亮
- [ ] 建筑选中框 / 血条 / 集结点标记更明显
- [ ] 鼠标 cursor 全套 RA2-like 状态
- [ ] 设置菜单 / 暂停菜单 / 退出重开
- [x] Skirmish setup 界面

## B12. 音频 / 氛围
- [ ] EVA 语音系统（原创）
- [ ] 关键提示音（建造完成、单位就绪、低电、敌袭）
- [ ] 背景音乐框架
- [ ] 阵营差异音效
- [ ] 单位移动 / 攻击 / 爆炸 / 建造音效
- [ ] 超级武器预警音效

## B13. AI（当前只是能打，不是像样的 skirmish AI）
- [x] 会扩张基础经济与出兵
- [x] 多 build order（已支持 Balanced Pressure / Armor Spearhead / Air Supremacy / Fortified Grind 四种 AI build order，并可在 skirmish setup 中配置）
- [ ] 阵营差异化 AI
- [x] 护矿 / 骚扰矿车
- [~] 防空意识（已补 Harrier / Airfield、Flak Track 对空锁定、Patriot Battery 防空塔，以及敌方机场/排队 Harrier 压力下的防空优先级响应；更完整的按敌方空军规模扩张防空体系仍未做完）
- [~] 修建筑 / 卖残血建筑等经济决策（AI 现在会优先启动关键建筑维修，并在防御塔/可舍弃供电建筑被持续打到残血时主动卖掉止损；更完整的维修预算、建筑级别优先级与前线撤资逻辑仍未完成）
- [ ] 科技攀升
- [~] 防御建筑布局（AI 现在会把 Pillbox / Sentry Gun / Patriot Battery 朝敌方来向摆到基地前沿并做基础侧向分散，不再随机埋在基地肚子里；更完整的 choke/高地/多层火网布局仍未完成）
- [ ] 多线进攻
- [x] 目标优先级（矿车、电厂、科技建筑）细化（AI 现在会显式优先骚扰矿车、狙击能触发 low power 的电厂，并在敌方 tech-up 后优先点名 Battle Lab / Airfield 这类高价值科技目标）
- [ ] 海空军使用能力
- [ ] 难度等级

## B14. 多人/遭遇战外壳
- [x] 多 AI 玩家支持
- [~] 2v2 / free-for-all 基础结构（已补 1vN 多 AI 混战与 AI 间最近敌对目标切换；显式队伍/盟友设置仍未完成）
- [ ] 阵营与颜色选择
- [ ] 地图选择界面
- [x] AI 难度选择
- [x] 游戏速度选项
- [ ] 观察模式 / replay（长期项）

## B15. 视觉语言与美术方向
- [~] 低模 3D 可读，但离 RA2 预渲染 sprite 语言还有明显距离
- [ ] `js/sprites.js` 正式接入主流程
- [ ] 建筑 sprite / unit sheet / effects 统一风格
- [ ] cameo 与 HUD 图标统一风格
- [ ] 建筑 construction 动画更像 RA2
- [ ] 单位死亡残骸 / 倒地 / 烧毁状态更丰富
- [ ] 矿区、爆炸、烟雾、光效的原创强化

## B16. 工程结构与可维护性
- [x] 抽出 `js/data/*` 与 `js/systems/power.js`
- [ ] `game.js` 继续拆分（现在仍然太胖）
- [ ] economy / production / combat / ai / ui 模块化
- [ ] 更细的 automated tests
- [ ] 可复用的 balancing constants
- [ ] save/load replay-friendly 状态结构（长期项）

---

## C. 建议执行顺序（按价值排序）

### C1. P0：先把“遭遇战成立”补齐
- [x] Construction Yard / MCV / 正式开局
- [x] Engineer
- [x] Dog / Rocket infantry / AA infantry（至少 2 个）
- [x] Radar 独立建筑化
- [x] 取消生产 / 退款
- [x] waypoint / rally 可视化
- [x] 基础防御建筑（至少 2 个）
- [x] AI 护矿与骚扰
- [x] 更完整的 skirmish setup

### C2. P1：把“中局节奏”补出来
- [x] Battle Lab
- [~] 更多载具与反制链（已补 V3 Artillery + APC 装载/卸载 + 基础运输协同 AI + IFV + Flak Track + Harrier 回场补弹，仍缺更复杂的运输战术与更完整的空地反制反馈）
- [x] veterancy
- [x] air units（已补 Airfield + Harrier 基础空袭链路）
- [x] more maps
- [~] walls / bridges / garrison（已补 walls + Battle Bunker / Civilian Block infantry garrison + 地图内中立城市驻守点，bridges 与更完整的城市群仍未完成）

### C3. P2：把“RA2 味道”补出来
- [ ] sprite/cameo 主视觉切换
- [ ] 原创 EVA + BGM + SFX
- [ ] superweapons
- [ ] naval layer
- [ ] faction personalities

---

## D. 当前结论

当前项目已经不是 demo 级空壳了，已经具备：
- 基础 RTS 操作
- 矿车经济
- 电力系统
- 步兵 + 坦克中局雏形
- 生产控制（repair / sell / rally）

但离 **RA2 遭遇战完整版** 还差得非常远，尤其缺：
- 真正的开局结构（MCV / CY）
- 大量建筑与兵种 roster
- Allied / Soviet 阵营分化
- 空军 / 海军 / 超武
- veterancy / special abilities / richer combat matrix
- RA2 风格 UI / 音频 / cameo / sprite 语言
- 更强的 skirmish AI 与 setup 外壳

换句话说：
**现在已经有“RTS 核心骨架”，但还远没到“RA2 遭遇战功能完整”的程度。**
