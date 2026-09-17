import data from '../qgcs4/qgcs4PreviewData.json' with { type: 'json' }
import { PLAYER_COPY } from '../qgcs4/qgcs4PlayerNotes.js'
import { POSITION_COPY, localize, textFor } from '../qgcs4/qgcs4PreviewCopy.js'
import * as model from '../qgcs4/qgcs4PreviewModel.js'
import { getSeasonReportDefinition, SEASON_REPORT_SCHEMA_VERSION } from './seasonReportCatalog.js'

const definition = getSeasonReportDefinition('QGCS4')

export function createQgcs4SeasonReport(previewPath = definition.previewPath) {
  return Object.freeze({
    schemaVersion: SEASON_REPORT_SCHEMA_VERSION,
    ...definition,
    previewPath,
    data,
    PLAYER_COPY,
    POSITION_COPY,
    localize,
    textFor,
    ...model,
    reportVersion: model.QGCS4_REPORT_VERSION,
    dataAsOf: '2026.08.31 · V30',
    previewLink: navigation => model.previewLink({ ...navigation, basePath: previewPath })
  })
}

export const qgcs4SeasonReport = createQgcs4SeasonReport()
