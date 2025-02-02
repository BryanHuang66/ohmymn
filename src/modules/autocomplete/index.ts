import {
  appendTextComment,
  MbBookNote,
  modifyNodeTitle,
  removeCommentButLinkTag,
  showHUD,
  undoGroupingWithRefresh
} from "marginnote"
import { defineConfig } from "~/profile"
import { CellViewType } from "~/typings"
import { checkPlainText, doc } from "~/utils"
import { lang } from "./lang"
import { completeWord } from "./utils"

export default defineConfig({
  name: "AutoComplete",
  key: "autocomplete",
  intro: lang.intro,
  link: doc("autocomplete"),
  settings: [
    {
      key: "on",
      type: CellViewType.Switch,
      label: lang.on,
      auto: {
        generateTitles: {
          index: -999,
          method({ text, note }) {
            return completeWord(text, note)
          }
        }
      }
    },
    {
      key: "collins",
      type: CellViewType.MuiltSelect,
      option: lang.collins.$option6,
      label: lang.collins.label,
      help: lang.collins.help
    },
    {
      key: "dataSource",
      type: CellViewType.Select,
      option: lang.data_source.$option2,
      label: lang.data_source.label,
      help: lang.data_source.help
    },
    {
      key: "fillWordInfo",
      type: CellViewType.Select,
      option: lang.fill_word_info.$option3,
      label: lang.fill_word_info.label
    },
    {
      key: "customFillFront",
      type: CellViewType.Input,
      help: lang.custom_fill_front.help,
      bind: ["fillWordInfo", 1],
      link: lang.custom_fill_front.link,
      check({ input }) {
        checkPlainText(input)
        if (/{{\s*(?:zh|en)\s*}}/.test(input))
          throw lang.custom_fill_front.error
      }
    },
    {
      key: "customFill",
      type: CellViewType.Input,
      help: lang.custom_fill,
      bind: ["fillWordInfo", 1],
      check({ input }) {
        checkPlainText(input)
      }
    },
    {
      key: "selectMeanings",
      type: CellViewType.MuiltSelect,
      option: lang.select_meaning.$option2,
      label: lang.select_meaning.label,
      bind: [
        [
          ["fillWordInfo", 1],
          ["fillWordInfo", 2]
        ]
      ]
    },
    {
      key: "selectLemma",
      type: CellViewType.Switch,
      label: lang.select_lemma
    },
    {
      key: "autoContext",
      type: CellViewType.Switch,
      label: lang.auto_context.label,
      help: lang.auto_context.help
    },
    {
      key: "translateContext",
      type: CellViewType.Switch,
      label: lang.translate_context.label,
      help: lang.translate_context.help,
      bind: ["autoContext", true]
    }
  ],
  actions4card: [
    {
      key: "completeWord",
      type: CellViewType.Button,
      label: lang.complete_word.label,
      option: lang.complete_word.$option2,
      method: async ({ nodes, option }) => {
        if (option === -1) return
        const { dataSource } = self.globalProfile.autocomplete
        if (dataSource[0] === 0) {
          if (nodes.length > 5) {
            showHUD(lang.forbid, 2)
            nodes = nodes.slice(0, 5)
          }
        }
        const getCompletedWord = (node: MbBookNote) => {
          const text = node?.noteTitle?.split(/\s*[;；]\s*/)[0]
          return text ? completeWord(text, node) : undefined
        }

        const allInfo = await Promise.all(
          nodes.map(node => getCompletedWord(node))
        )
        undoGroupingWithRefresh(() => {
          nodes.forEach((node, index) => {
            const info = allInfo?.[index]
            if (info) {
              const { title, comments } = info
              modifyNodeTitle(node, title)
              removeCommentButLinkTag(
                node,
                k =>
                  k.type === "PaintNote" ||
                  option !== 1 ||
                  k.type === "HtmlNote",
                n => {
                  appendTextComment(n, ...comments)
                }
              )
            }
          })
        })
      }
    }
  ]
})
