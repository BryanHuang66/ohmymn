import * as anotherautotitle from "addons/anotherautotitle"
import * as autocomplete from "addons/autocomplete"
import * as autolist from "addons/autolist"
import * as autoreplace from "addons/autoreplace"
import * as autostandardize from "addons/autostandardize"
import * as magicaction from "addons/magicaction"
import * as anotherautodef from "addons/anotherautodef"
import * as ohmymn from "addons/ohmymn"

// 不要包含 magication，顺序为显示的顺序，magiction 始终为第1个
const addons = [
  ohmymn,
  anotherautotitle,
  anotherautodef,
  autostandardize,
  autocomplete,
  autoreplace,
  autolist
]

const genSection = (config: IConfig): ISection => {
  const rows: Array<IRow> = [
    {
      type: cellViewType.plainText,
      label: config.intro,
      link: config.link ?? ""
    }
  ]
  for (const setting of config.settings) {
    if (
      setting.help &&
      setting.type != cellViewType.buttonWithInput &&
      setting.type != cellViewType.button
    )
      rows.push({
        type: cellViewType.plainText,
        label: setting.help,
        link: setting.link ?? ""
      })
    else if (setting.label && setting.type == cellViewType.input)
      rows.push({
        type: cellViewType.plainText,
        label: setting.label,
        link: setting.link ?? ""
      })
    //@ts-ignore
    rows.push(setting)
  }
  return {
    header: config.name,
    rows
  }
}

export const genDataSource = (
  configs: Array<IConfig>,
  magicaction: IConfig
): Array<ISection> => {
  const dataSource: Array<ISection> = []
  for (let config of configs) {
    dataSource.push(genSection(config))
    if (config.actions.length) {
      for (let action of config.actions) magicaction.actions.push(action)
    }
    magicaction.settings = magicaction.actions.sort(
      (a: ISetting, b: ISetting) => {
        const val1 = a.label!.length
        const val2 = b.label!.length
        return val1 - val2
      }
    )
  }
  dataSource.splice(0, 0, genSection(magicaction))
  // 最后加块空白，防止被键盘遮挡，按理说输入框会自动上移的，但现在不知道为啥不行了
  dataSource[dataSource.length - 1].rows.push(
    {
      type: cellViewType.plainText,
      label:
        "祝考研的各位同学成功上岸，本次更新后在考研结束前将不再更新。如果 ohmymn 对你有所帮助，欢迎赞赏，点击即可直达二维码😎。\n",
      link: "https://cdn.jsdelivr.net/gh/ourongxing/ohmymn/assets/donate.gif"
    },
    {
      type: cellViewType.button,
      key: "space",
      label: ""
    }
  )
  return dataSource
}

const genDataSourceIndex = (dataSource: Array<ISection>) => {
  const dataSourceIndex: {
    [k: string]: {
      [k: string]: [number, number]
    }
  } = {}
  dataSource.forEach((section, secIndex) => {
    const name = section.header.toLowerCase()
    if (name != "magicaction") {
      dataSourceIndex[name] = {}
      section.rows.forEach((row, rowIndex) => {
        switch (row.type) {
          case cellViewType.input:
          case cellViewType.switch:
          case cellViewType.select:
          case cellViewType.inlineInput:
          case cellViewType.muiltSelect:
            dataSourceIndex[name][row.key] = [secIndex, rowIndex]
        }
      })
    }
  })
  return dataSourceIndex
}

const genActionsUtils = () => {
  const actions = { ...magicaction.action }
  for (const addon of addons) {
    Object.assign(actions, addon.action)
  }
  return actions
}

export const actions = genActionsUtils()
export const dataSource: Array<ISection> = genDataSource(
  addons.map(addon => addon.config),
  magicaction.config
)
export const dataSourceIndex = genDataSourceIndex(dataSource)
