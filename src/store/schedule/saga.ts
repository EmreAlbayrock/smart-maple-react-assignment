/* eslint-disable @typescript-eslint/no-unused-expressions */
import type { Action } from "redux-actions";

import { put, takeEvery } from "redux-saga/effects";

import Logger from "../../utils/logger";
import { updateProgress } from "../ui/actions";
import * as actions from "./actions";
import types from "./types";

import { scheduleReponse } from "../../constants/api";
import type { Callbacks } from "../../utils/types";

function* asyncFetchSchedule({
  payload: { onSuccess, onError } = {},
}: Action<Callbacks>) {
  yield put(updateProgress());
  try {
    const response = scheduleReponse;
    yield put(actions.fetchScheduleSuccess(response.data));

    onSuccess && onSuccess(response);
  } catch (err) {
    Logger.error(err);
    onError && onError(err);

    yield put(actions.fetchScheduleFailed());
  } finally {
    yield put(updateProgress(false));
  }
}

const scheduleSagas = [takeEvery(types.FETCH_SCHEDULE, asyncFetchSchedule)];

export default scheduleSagas;
