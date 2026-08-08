export enum App {
  SUDOKU = 'sudoku',
  UNBLOCKRACE = 'unblockrace',
  MONEYBAGSRACE = 'moneybagsrace',
}

// Apps allowing GET /sessions?userId=... to fetch another party member's sessions
export const APPS_ALLOWING_CROSS_USER_SESSION_LOOKUP = [
  App.SUDOKU,
  App.UNBLOCKRACE,
  App.MONEYBAGSRACE,
];

// Apps that include party members' sessions in the findOne/update 'parties' field
export const APPS_ALLOWING_PARTY_SESSIONS_IN_RESPONSE = [
  App.SUDOKU,
  App.UNBLOCKRACE,
  App.MONEYBAGSRACE,
];
