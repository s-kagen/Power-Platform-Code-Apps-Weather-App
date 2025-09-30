/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * This file is auto-generated. Do not modify it manually.
 * Changes to this file may be overwritten.
 */

export const dataSourcesInfo = {
  "msnweather": {
    "tableId": "",
    "version": "",
    "primaryKey": "",
    "dataSourceType": "Connector",
    "apis": {
      "CurrentWeather": {
        "path": "/{connectionId}/current/{Location}",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Location",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "units",
            "in": "query",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          }
        }
      },
      "OnCurrentWeatherChange": {
        "path": "/{connectionId}/trigger/current/weather/{Location}",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Location",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Measure",
            "in": "query",
            "required": true,
            "type": "string"
          },
          {
            "name": "When",
            "in": "query",
            "required": true,
            "type": "string"
          },
          {
            "name": "Target",
            "in": "query",
            "required": true,
            "type": "number"
          },
          {
            "name": "units",
            "in": "query",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          }
        }
      },
      "OnCurrentConditionsChange": {
        "path": "/{connectionId}/trigger/current/conditions/{Location}",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Location",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "units",
            "in": "query",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          }
        }
      },
      "TodaysForecast": {
        "path": "/{connectionId}/forecast/today/{Location}",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Location",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "units",
            "in": "query",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          }
        }
      },
      "TomorrowsForecast": {
        "path": "/{connectionId}/forecast/tomorrow/{Location}",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Location",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "units",
            "in": "query",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "object"
          }
        }
      },
      "GetMeasureUnits": {
        "path": "/{connectionId}/current/units/{Location}",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Location",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "Measure",
            "in": "query",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "array"
          }
        }
      }
    }
  }
};
