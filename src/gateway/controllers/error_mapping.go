package controllers

import (
	"gateway/controllers/responses"
	apperrors "gateway/errors"
	"net/http"
)

func respondInternalOrUnavailable(w http.ResponseWriter, err error) {
	if apperrors.IsDependencyUnavailable(err) {
		responses.ServiceUnavailable(w, err.Error())
		return
	}

	responses.InternalError(w)
}

func respondNotFoundOrUnavailable(w http.ResponseWriter, err error, recType string) {
	if apperrors.IsDependencyUnavailable(err) {
		responses.ServiceUnavailable(w, err.Error())
		return
	}

	responses.RecordNotFound(w, recType)
}
