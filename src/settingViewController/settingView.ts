import {
  isNSNull,
  MN,
  NSIndexPath,
  NSTextAlignment,
  UITableView
} from "marginnote"
import { Addon } from "~/addon"
import { dataSourceIndex } from "~/dataSource"
import lang from "~/lang"
import { moduleKeys, ModuleKeyType } from "~/mergeMethod"
import { BindType, CellViewType, IRowSelect } from "~/typings"
import { byteLength, byteSlice, byteSplitByLen, serialSymbols } from "~/utils"

function _indexPath2tag(indexPath: NSIndexPath): number {
  return indexPath.section * 100 + indexPath.row + 999
}

// If the module is not enabled, the menu will be hidden
export function _isModuleOFF(key: ModuleKeyType): boolean {
  const [sec, row] = dataSourceIndex.addon.quickSwitch
  const quickSwitch = (self.dataSource[sec].rows[row] as IRowSelect).selections
  const index = moduleKeys.indexOf(key)
  return index !== -1 && !quickSwitch.includes(index)
}

function numberOfSectionsInTableView() {
  return self.dataSource.length
}
function tableViewNumberOfRowsInSection(
  tableView: UITableView,
  section: number
) {
  const { key } = self.dataSource[section]
  return _isModuleOFF(key) ? 0 : self.dataSource[section].rows.length
}

const tableViewTitleForHeaderInSection = (
  tableView: UITableView,
  section: number
) => {
  const { key, header } = self.dataSource[section]
  return _isModuleOFF(key) ? new NSNull() : header
}

// If one of the bind objects does not meet the requirements, it will be hidden
function _isBindOFF(bindArr: BindType, sectionKey: string) {
  /**
   * const bind = ["key", [1,2]]
   * const bind = [
   *  ["key", 1],
   *  ["key", true]
   * ]
   * const bind = [
   *  ["key", 1],
   *  [
   *    ["key", 1],
   *    ["key", true]
   *  ]
   * ]
   */
  const bindItems = Array.isArray(bindArr[0])
    ? (bindArr as Array<MaybeArray<[string, number | number[] | boolean]>>)
    : ([bindArr] as Array<MaybeArray<[string, number | number[] | boolean]>>)
  return !bindItems.every(bind => {
    const binds = Array.isArray(bind[0])
      ? (bind as [string, number | number[] | boolean][])
      : ([bind] as [string, number | number[] | boolean][])
    return binds.some(bind => {
      const [key, v] = bind
      const [secIndex, rowIndex] = dataSourceIndex?.[sectionKey]?.[key]
      if (secIndex === undefined) {
        console.error(`bind key does not exist：${key}`)
        return true
      }
      const row = self.dataSource?.[secIndex].rows?.[rowIndex]
      if (row.type === CellViewType.Switch && typeof v === "boolean")
        return row.status === v
      else if (
        row.type === CellViewType.Select ||
        row.type === CellViewType.MuiltSelect
      ) {
        if (typeof v === "number") return row.selections.includes(v)
        else if (Array.isArray(v)) {
          return v.some(h => row.selections.includes(h))
        }
      }
      return false
    })
  })
}

function tableViewHeightForRowAtIndexPath(
  tableView: UITableView,
  indexPath: NSIndexPath
) {
  const { rows, key } = self.dataSource[indexPath.section]
  const row = rows[indexPath.row]
  switch (row.type) {
    case CellViewType.Button:
    case CellViewType.ButtonWithInput:
      if (row.module && _isModuleOFF(row.module)) return 0
      break
    case CellViewType.PlainText: {
      if (row.bind && _isBindOFF(row.bind, key)) return 0
      const lines = byteSplitByLen(row.label, 45).length - 1
      const lineBreaks = row.label.match(/\n/g)?.length ?? 0
      return (lines > lineBreaks ? lines : lineBreaks) * 15 + 30
    }
    default:
      if (row.bind && _isBindOFF(row.bind, key)) return 0
  }
  return 40
}

function tableViewCellForRowAtIndexPath(
  tableView: UITableView,
  indexPath: NSIndexPath
) {
  const { rows, key } = self.dataSource[indexPath.section]
  const row = rows[indexPath.row]
  switch (row.type) {
    case CellViewType.PlainText: {
      const cell = UITableViewCell.makeWithStyleReuseIdentifier(
        0,
        "PlainTextCellID"
      )
      if (!MN.isMac && row.bind && _isBindOFF(row.bind, key)) cell.hidden = true
      cell.selectionStyle = 0
      cell.textLabel.opaque = false
      cell.textLabel.textAlignment = 0
      cell.textLabel.lineBreakMode = 0
      cell.textLabel.numberOfLines = 0
      cell.textLabel.textColor = UIColor.grayColor()
      cell.textLabel.font = UIFont.systemFontOfSize(12)
      cell.textLabel.text = row.label
      return cell
    }
    case CellViewType.Button:
    case CellViewType.ButtonWithInput: {
      const cell = UITableViewCell.makeWithStyleReuseIdentifier(
        0,
        "ButtonCellID"
      )
      cell.textLabel.font = UIFont.systemFontOfSize(16)
      if (MN.isMac) cell.textLabel.textColor = Addon.textColor
      cell.textLabel.text = row.label
      const image = NSData.dataWithContentsOfFile(
        Addon.path + `/icon/${row.key}.png`
      )
      if (!isNSNull(image))
        cell.imageView.image = UIImage.imageWithDataScale(image, 2)
      return cell
    }
    case CellViewType.Switch: {
      const cell = UITableViewCell.makeWithStyleReuseIdentifier(
        0,
        "SwitchCellID"
      )
      if (!MN.isMac && row.bind && _isBindOFF(row.bind, key)) cell.hidden = true
      cell.selectionStyle = 0
      cell.textLabel.text = row.label
      cell.textLabel.font = UIFont.systemFontOfSize(16)
      if (MN.isMac) cell.textLabel.textColor = Addon.textColor
      const view = initCellView.switch(row.status ?? false)
      const newFrame = view.frame
      newFrame.x = cell.contentView.frame.width - newFrame.width - 10
      view.frame = newFrame
      view.autoresizingMask = 1 << 0
      view.tag = _indexPath2tag(indexPath)
      cell.contentView.addSubview(view)
      return cell
    }
    case CellViewType.InlineInput: {
      const cell = UITableViewCell.makeWithStyleReuseIdentifier(
        0,
        "inlineInputCellID"
      )
      if (!MN.isMac && row.bind && _isBindOFF(row.bind, key)) cell.hidden = true
      cell.selectionStyle = 0
      cell.textLabel.font = UIFont.systemFontOfSize(16)
      if (MN.isMac) cell.textLabel.textColor = Addon.textColor
      cell.textLabel.text = row.label
      const view = initCellView.inlineInput(row.content ?? "")
      const newFrame = view.frame
      newFrame.x = cell.contentView.frame.width - newFrame.width - 10
      view.frame = newFrame
      view.autoresizingMask = 1 << 0
      // Do not pass indexPath directly, and set the indexPath property
      // Tag is unqiue, larger will be better
      view.tag = _indexPath2tag(indexPath)
      cell.contentView.addSubview(view)
      return cell
    }
    case CellViewType.Input: {
      const cell = UITableViewCell.makeWithStyleReuseIdentifier(
        0,
        "inputCellID"
      )
      if (!MN.isMac && row.bind && _isBindOFF(row.bind, key)) cell.hidden = true
      cell.textLabel.font = UIFont.systemFontOfSize(16)
      if (MN.isMac) cell.textLabel.textColor = Addon.textColor
      cell.selectionStyle = 0
      const view = initCellView.input(row.content ?? "")
      view.autoresizingMask = 1 << 0
      view.tag = _indexPath2tag(indexPath)
      cell.contentView.addSubview(view)
      return cell
    }
    case CellViewType.MuiltSelect:
    case CellViewType.Select: {
      const cell = UITableViewCell.makeWithStyleReuseIdentifier(
        0,
        "selectCellID"
      )
      if (!MN.isMac && row.bind && _isBindOFF(row.bind, key)) cell.hidden = true
      cell.textLabel.font = UIFont.systemFontOfSize(16)
      if (MN.isMac) cell.textLabel.textColor = Addon.textColor
      cell.textLabel.text = row.label
      cell.selectionStyle = 0
      const view = initCellView.select(
        row.type == CellViewType.Select
          ? row.option[row.selections[0]]
          : row.selections.length
          ? `${row.selections.length} ✓`
          : lang.none
      )
      const newFrame = view.frame
      newFrame.x = cell.contentView.frame.width - newFrame.width - 10
      view.frame = newFrame
      view.autoresizingMask = 1 << 0
      view.tag = _indexPath2tag(indexPath)
      cell.contentView.addSubview(view)
      return cell
    }
  }
}

// Only can be used in SettingViewController
const initCellView = {
  switch(status: boolean) {
    const frame = { x: 0, y: 5, width: 70, height: 30 }
    const view = new UISwitch(frame)
    view.addTargetActionForControlEvents(self, "switchChange:", 1 << 12)
    view.backgroundColor = UIColor.clearColor()
    view.on = status
    return view
  },
  select(text: string) {
    const frame = { x: 0, y: 5, width: 70, height: 30 }
    const view = new UIButton(frame)
    text = text.replace(
      new RegExp(`^[\x20—${serialSymbols.hollow_circle_number}]+`),
      ""
    )
    view.setTitleForState(
      byteLength(text) <= 8 ? text : byteSlice(text, 0, 6).trimEnd() + "...",
      0
    )
    view.setTitleColorForState(UIColor.whiteColor(), 0)
    view.backgroundColor = Addon.buttonColor
    view.layer.cornerRadius = 10
    view.layer.masksToBounds = true
    view.titleLabel.font = UIFont.boldSystemFontOfSize(14)
    view.titleLabel.lineBreakMode = 4
    view.addTargetActionForControlEvents(self, "clickSelectButton:", 1 << 6)
    return view
  },
  inlineInput(text: string) {
    const frame = { x: 0, y: 9, width: 70, height: 30 }
    if (!MN.isMac) {
      frame.y = 5
      frame.width = 100
    }
    const view = new UITextField(frame)
    view.font = UIFont.systemFontOfSize(15)
    view.textAlignment = NSTextAlignment.Right
    if (MN.isMac) view.textColor = Addon.textColor
    view.delegate = self
    view.text = text
    view.placeholder = "Enter"
    view.autoresizingMask = (1 << 1) | (1 << 5)
    return view
  },
  input(text: string) {
    const frame = { x: 40, y: 9, width: 250, height: 30 }
    if (!MN.isMac) frame.y = 5
    const view = new UITextField(frame)
    view.font = UIFont.systemFontOfSize(15)
    if (MN.isMac) view.textColor = Addon.textColor
    view.placeholder = lang.input_over
    view.delegate = self
    view.autoresizingMask = (1 << 1) | (1 << 5)
    view.text = text
    return view
  }
}

export default {
  numberOfSectionsInTableView,
  tableViewNumberOfRowsInSection,
  tableViewCellForRowAtIndexPath,
  tableViewTitleForHeaderInSection,
  tableViewHeightForRowAtIndexPath
}
