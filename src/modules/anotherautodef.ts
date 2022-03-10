import { regFlag, string2ReplaceParam } from "utils/input"
import { getExcerptNotes, getExcerptText, removeHighlight } from "utils/note"
import type { IActionMethods, IConfig } from "typings"
import { cellViewType } from "typings/enum"
import lang from "lang"
import { unique } from "utils"
import { extractArray } from "utils/custom"

const { label, option, intro, link } = lang.module.anotherautodef
const config: IConfig = {
  name: "Another AutoDef",
  intro,
  link,
  settings: [
    {
      key: "on",
      type: cellViewType.switch,
      label: lang.module.more.auto
    },
    {
      key: "preset",
      type: cellViewType.muiltSelect,
      option: option.preset,
      label: label.preset
    },
    {
      key: "customExtractTitle",
      type: cellViewType.input,
      bind: [["preset", 0]],
      label: label.custom_extract_title,
      link
    },
    {
      key: "customDefLink",
      type: cellViewType.input,
      bind: [["preset", 1]],
      label: label.custom_def_link,
      link
    },
    {
      key: "onlyDesc",
      type: cellViewType.switch,
      label: label.only_desc
    },
    {
      key: "toTitleLink",
      type: cellViewType.switch,
      label: label.to_title_link
    },
    {
      type: cellViewType.muiltSelect,
      key: "titleLinkSplit",
      label: label.title_link_split,
      option: option.title_link_split,
      bind: [["toTitleLink", 1]]
    },
    {
      key: "customTitleSplit",
      type: cellViewType.input,
      label: label.custom_title_split,
      // 绑定了两个，一个是 switch，用 0 表示 false，一个是 select
      bind: [
        ["toTitleLink", 1],
        ["titleLinkSplit", 0]
      ],
      link
    }
  ],
  actions4card: [
    {
      type: cellViewType.buttonWithInput,
      label: label.extract_title,
      option: option.extract_title,
      key: "extractTitle"
    }
  ]
}

enum AutoDefPreset {
  CustomExtract,
  CustomTitleSplit
}

export const enum TitleLinkSplit {
  Custom,
  Default,
  Punctuation
}

const util = {
  toTitleLink(text: string) {
    if (!self.profile.anotherautodef.toTitleLink) return [text]
    const regs: RegExp[] = []
    const { titleLinkSplit } = self.profile.anotherautodef
    const { customTitleSplit } = self.profileTemp.regArray
    if (titleLinkSplit.includes(TitleLinkSplit.Custom) && customTitleSplit)
      regs.push(...customTitleSplit[0])
    if (titleLinkSplit.includes(TitleLinkSplit.Default))
      regs.push(/或者?|[简又]?称(?:之?为)?/g)
    if (titleLinkSplit.includes(TitleLinkSplit.Punctuation)) {
      regs.push(/[、。,，‘’“”"『』()（）【】「」《》«»\/\[\]]/g)
    }

    const defs = regs
      .reduce((acc, reg) => acc.replace(regFlag.add(reg, "g"), "😎"), text)
      .split("😎")
      .reduce((acc, k) => {
        k = k.trim()
        if (k) acc.push(k)
        return acc
      }, [] as string[])
    return defs.length > 1 ? unique<string>(defs) : [text]
  },

  /**
   * 返回的标题需要去除划重点
   */
  getDefTitle(text: string) {
    const { preset, onlyDesc } = self.profile.anotherautodef
    for (const set of preset)
      switch (set) {
        case AutoDefPreset.CustomExtract: {
          const { customExtractTitle: params } = self.profileTemp.replaceParam
          if (!params) continue
          let fnKey = 0
          const allTitles = unique<string>(
            params
              .filter(param => param.regexp.test(text))
              .map(param => {
                // 有 1 则为1
                if (fnKey == 0) fnKey = param.fnKey
                param.regexp = regFlag.add(param.regexp, "g")
                return text
                  .match(param.regexp)!
                  .map(item => item.replace(param.regexp, param.newSubStr))
              })
              .flat()
          )
          if (allTitles.length)
            return {
              title: allTitles,
              text: fnKey ? "" : text
            }
          break
        }
        case AutoDefPreset.CustomTitleSplit:
          const { customDefLink } = self.profileTemp.regArray
          if (!customDefLink) continue
          const regs = customDefLink[0]
          for (let reg of regs) {
            let isReverse = false
            // 使用 y 来表示定义项在后面的情况，则 y 失效，应该很少人会用到 y
            if (reg.sticky) {
              reg = regFlag.remove(reg, "y")
              isReverse = true
            }
            if (reg.test(text)) {
              let [def, desc] = text.split(reg).filter(k => k)
              // 交换顺序
              if (isReverse) [def, desc] = [desc, def]
              return {
                title: util.toTitleLink(def),
                text: onlyDesc ? desc : text
              }
            }
          }
          break
        case 2:
        case 3:
        case 4:
        case 5:
        case 6: {
          const reg = [
            /[：:]/,
            /[一—]{2}/,
            /[,，]\s*(?:通常|一般)*是指?/,
            /(?:通常|一般)*是指?\s*[,，]/,
            /(?:通常|一般)*是指/
          ][set - 2]
          if (reg.test(text)) {
            const [def, desc] = text.split(reg)
            return {
              title: util.toTitleLink(def),
              text: onlyDesc ? desc : text
            }
          }
          break
        }
        // 以下为定义项在后面的情况
        case 7:
        case 8: {
          const reg = [/[,，].*称之?为/, /(?:通常|一般)?被?称之?为/][set - 7]
          if (reg.test(text)) {
            const [desc, def] = text.split(reg)
            return {
              title: util.toTitleLink(def),
              text: onlyDesc ? desc : text
            }
          }
          break
        }
      }
  }
}
enum ExtractTitle {
  UseAutoDef
}

const action: IActionMethods = {
  extractTitle({ nodes, content, option }) {
    if (option == ExtractTitle.UseAutoDef) {
      nodes.forEach(node => {
        const allTitles = getExcerptNotes(node).reduce((acc, cur) => {
          if (cur.excerptText) {
            const res = util.getDefTitle(cur.excerptText)
            if (res) {
              const { title, text } = res
              cur.excerptText = text
              if (title.length) acc.push(...title)
            }
          }
          return acc
        }, [] as string[])
        if (allTitles.length)
          node.noteTitle = removeHighlight(unique(allTitles).join("; "))
      })
    } else if (content) {
      const params = string2ReplaceParam(content)
      nodes.forEach(node => {
        const text = getExcerptText(node).join("\n")
        const allTitles = extractArray(text, params)
        if (allTitles.length)
          node.noteTitle = removeHighlight(allTitles.join("; "))
      })
    }
  }
}
export { config, util, action }
