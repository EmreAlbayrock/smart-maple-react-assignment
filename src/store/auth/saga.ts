/* eslint-disable @typescript-eslint/no-unused-expressions */
import type { Action } from "redux-actions";

import { debounce, put } from "redux-saga/effects";

import { profileResponse } from "../../constants/api";
import Logger from "../../utils/logger";
import AuthSession from "../../utils/session";
import type { Callbacks } from "../../utils/types";
import * as actions from "../auth/actions";
import types from "../auth/types";
import { updateProgress } from "../ui/actions";

const QUERY_DEBOUNCE = 1000;

function* asyncLogin({
  payload: { onSuccess, onError } = {},
}: Action<Callbacks>) {
  yield put(updateProgress());
  try {
    const response = profileResponse;
    yield put(actions.signinSuccess(response.data));

    AuthSession.setId(response.data.id);
    AuthSession.setName(response.data!.name);
    AuthSession.setEmail(response.data!.email);
    AuthSession.setPhoneNumber(response.data!.phoneNumber);
    AuthSession.setOrganizationId(response.data!.organizationId);
    AuthSession.setDepartmentId(response.data!.currentDepartmentId);
    // Burada role nesnesi yerine sadece ismi alıyoruz
    AuthSession.setRoles(response.data!.role.name);
    AuthSession.setLanguage(response.data.language);

    onSuccess && onSuccess(response);
  } catch (err) {
    Logger.error(err);
    onError && onError(err);
    yield put(actions.signinFailed());
  } finally {
    yield put(updateProgress(false));
  }
}

const authSagas = [debounce(QUERY_DEBOUNCE, types.SIGNIN, asyncLogin)];

export default authSagas;
