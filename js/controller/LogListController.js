/**
 * Controller för listning av loggnoteringar.
 *
 * @license CC-BY 4.0
 */
export class LogListController extends ControllerBase {
  /**
   * @inheritDoc
   * @override
   * @throws {TypeError} Ärendenummer saknas.
   */
  async prepare(context) {
    const caseID = context.case;
    const view = this._view;
    if (!caseID) {
      throw new TypeError('Ange ärendeidentitet.');
    }
    const aCase = await this._model.getCase(caseID);

    view.title = view.heading = `Ärendelogg ${aCase}`;

    view.breadcrumbs.case(
      caseID,
      aCase.toString(),
      aCase.organization.name,
      aCase.service.name
    );
    view.breadcrumbs.current = 'Ärendelogg';
    view.create = `?page=log&case=${caseID}&new`;

    const url = (i) => `?page=log&entry=${i}`;
    for (const entry of aCase.log()) {
      view.addEntry(
        url(entry.id),
        this.#typeSymbol(entry),
        this.#directionSymbol(entry),
        entry.timestamp,
        entry.summary
      );
    }
  }

  /**
   * Översätt informationriktning till en symbol.
   *
   * @private
   * @param {LogEntry} entry Loggnotering.
   * @return {string}
   */
  #directionSymbol(entry) {
    return (
      {
        [LogEntry.Direction.None]: '\u21e2', // RIGHTWARDS DASHED ARROW
        [LogEntry.Direction.Received]: '\u2193', // DOWNWARDS ARROW
        [LogEntry.Direction.Sent]: '\u2191', // UPWARDS ARROW
      }[entry.direction] ?? '?'
    );
  }

  /**
   * Översätt noteringstyp till en symbol.
   *
   * @private
   * @param {LogEntry} entry Loggnotering.
   * @return {string}
   */
  #typeSymbol(entry) {
    return (
      {
        [LogEntry.EntryType.ActionPlan]: '\u2611', // BALLOT BOX WITH CHECK
        [LogEntry.EntryType.Appeal]: '\u2709', // ENVELOPE
        [LogEntry.EntryType.AuditFinish]: '\u23f9', // BLACK SQUARE FOR STOP
        [LogEntry.EntryType.AuditStart]: '\u23f5', // BLACK MEDIUM RIGHT-POINTING TRIANGLE
        [LogEntry.EntryType.CaseOpen]: '\u23f5', // BLACK MEDIUM RIGHT-POINTING TRIANGLE
        [LogEntry.EntryType.Deferment]: '\u2709', // ENVELOPE
        [LogEntry.EntryType.Email]: '\u2709', // ENVELOPE
        [LogEntry.EntryType.Injunction]: '§', // SECTION SIGN
        [LogEntry.EntryType.Letter]: '\u2709', // ENVELOPE
        [LogEntry.EntryType.Minutes]: '\u275e', // HEAVY DOUBLE COMMA QUOTATION MARK ORNAMENT
        [LogEntry.EntryType.Note]: '\u270e', // LOWER RIGHT PENCIL
        [LogEntry.EntryType.Notification]: '\u2310', // REVERSED NOT SIGN
        [LogEntry.EntryType.Other]: '\u2318', // PLACE OF INTEREST SIGN
        [LogEntry.EntryType.Remarks]: '§', // SECTION SIGN
        [LogEntry.EntryType.Telephone]: '\u260e', // BLACK TELEPHONE
      }[entry.type] ?? '?'
    );
  }
}

// Importera beroenden.
import { ControllerBase } from './ControllerBase.js';
import { LogEntry } from '../model/LogEntry.js';
