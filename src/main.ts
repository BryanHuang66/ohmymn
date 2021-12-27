import handleReceivedEvent from "jsExtension/handleReceivedEvent"
import switchPanel from "jsExtension/switchPanel"
import { getObjCClassDeclar } from "utils/common"
import lifeCycle, { clsMethons } from "jsExtension/lifeCycle"
import { MN } from "const"

JSB.newAddon = mainPath => {
  MN.mainPath = mainPath
  return JSB.defineClass(
    getObjCClassDeclar("OhMyMN", "JSExtension"),
    {
      ...lifeCycle,
      ...switchPanel,
      ...handleReceivedEvent
    },
    clsMethons
  )
}
