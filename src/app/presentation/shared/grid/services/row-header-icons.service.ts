import { Injectable } from '@angular/core';
import { DrawHelper } from 'src/app/helpers/draw-helper';
import { GridColorService } from './grid-color.service';

@Injectable({
  providedIn: 'root',
})
export class RowHeaderIconsService {
  constructor(private gridColors: GridColorService) {}

  private _width = 20;
  private _height = 20;

  private _filterPicto: HTMLCanvasElement | undefined;
  private _palmtreePicto: HTMLCanvasElement | undefined;
  private _gearPicto: HTMLCanvasElement | undefined;
  private _paperClipPicto: HTMLCanvasElement | undefined;
  private _paperPlaneExpiredPicto: HTMLCanvasElement | undefined;
  private _paperPlanePicto: HTMLCanvasElement | undefined;
  private _malePicto: HTMLCanvasElement | undefined;
  private _femalePicto: HTMLCanvasElement | undefined;
  private _diversSexPicto: HTMLCanvasElement | undefined;
  private _dogPicto: HTMLCanvasElement | undefined;
  private _batonPicto: HTMLCanvasElement | undefined;
  private _gunPicto: HTMLCanvasElement | undefined;
  private _govermentPicto: HTMLCanvasElement | undefined;

  private _defaultBackGroundColor = 'transparent';

  private dataArray = [
    {
      key: 'filterPicto',
      data: 'M1 0h22l-9 15.094v8.906l-4-3v-5.906z',
      fill: this.gridColors.mainFontColor,
      stroke: this.gridColors.mainFontColor,
      strokeWidth: 0,
      viewSizeWidth: 24,
      viewSizeHeight: 24,
    },

    {
      key: 'palmtreePicto',

      data: 'M248.958,406.438c-1.438-46.587-12.762-185.334-95.391-250.902c-15.579,23.039-50.108,86.269-41.919,187.136   c-11.266-44.511-38.172-115.083-19.263-206.712C63.612,142.505,11.875,156.898,0,177.926c5.598-28.49,49.709-90.296,96.825-102.823   c-0.117-0.088-0.235-0.182-0.354-0.238c0.103-0.122,0.222-0.177,0.327-0.299c-8.958-19.574-29.87-59.526-53.174-64.469   c22.596-1.157,68.085,11.28,95.257,32.546c82.372-51.648,162.717-41.64,211.232-42.2c-67.052,14.657-111.121,46.463-138.32,74.3   c76.836,18.127,132.155,60.919,170.36,84.645c-81.146-32.49-144.804-28.285-183.923-19.135   c33.92,33.554,80.033,128.944,113.146,253.831c2.366-0.089,4.671-0.443,7.042-0.443c67.584,0,130.52,34.531,166.797,91.568H151.628   C174.98,448.516,209.407,421.303,248.958,406.438z',
      fill: this.gridColors.mainFontColor,
      stroke: this.gridColors.mainFontColor,
      strokeWidth: 8,
      viewSizeWidth: 600,
      viewSizeHeight: 600,
    },

    {
      key: 'gearPicto',

      data: 'M24 14v-4h-3.23c-.229-1.003-.624-1.94-1.156-2.785l2.286-2.286-2.83-2.829-2.286 2.286c-.845-.532-1.781-.928-2.784-1.156v-3.23h-4v3.23c-1.003.228-1.94.625-2.785 1.157l-2.286-2.286-2.829 2.828 2.287 2.287c-.533.845-.928 1.781-1.157 2.784h-3.23v4h3.23c.229 1.003.624 1.939 1.156 2.784l-2.286 2.287 2.829 2.829 2.286-2.286c.845.531 1.782.928 2.785 1.156v3.23h4v-3.23c1.003-.228 1.939-.624 2.784-1.156l2.286 2.286 2.828-2.829-2.285-2.286c.532-.845.928-1.782 1.156-2.785h3.231zm-12 2c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4z',
      fill: this.gridColors.mainFontColor,
      stroke: this.gridColors.mainFontColor,
      strokeWidth: 0,
      viewSizeWidth: 24,
      viewSizeHeight: 24,
    },

    {
      key: 'paperClipPicto',

      data: 'M7 4v12.434c0 .636.28 1.239.765 1.649l3.598 3.043c.368.311.907.311 1.274 0l3.599-3.043c.485-.41.764-1.013.764-1.649v-13.934c0-.276-.224-.5-.5-.5h-5c-.276 0-.5.224-.5.5v9.697c0 .229.091.448.253.61l.513.513c.129.129.339.129.469 0l.513-.513c.161-.161.252-.381.252-.61v-7.197h2v7.585c0 .531-.211 1.04-.586 1.415l-1.707 1.707c-.195.195-.451.293-.707.293s-.512-.098-.707-.293l-1.707-1.707c-.375-.375-.586-.884-.586-1.415v-10.585c0-1.104.896-2 2-2h6c1.104 0 2 .896 2 2v14.606c0 1.162-.508 2.265-1.39 3.021l-4.715 4.042c-.257.22-.577.331-.895.331-.319 0-.638-.111-.896-.332l-4.714-4.041c-.883-.756-1.39-1.859-1.39-3.021v-12.606h2z',
      fill: this.gridColors.mainFontColor,
      stroke: this.gridColors.mainFontColor,
      strokeWidth: 0,
      viewSizeWidth: 24,
      viewSizeHeight: 24,
    },

    {
      key: 'paperPlaneExpiredPicto',

      data: 'M24 0l-6 22-8.129-7.239 7.802-8.234-10.458 7.227-7.215-1.754 24-12zm-15 16.668v7.332l3.258-4.431-3.258-2.901z',
      fill: this.gridColors.mainFontColor,
      stroke: this.gridColors.mainFontColor,
      strokeWidth: 0,
      viewSizeWidth: 24,
      viewSizeHeight: 24,
    },

    {
      key: 'paperPlanePicto',
      data: 'M0 12l11 3.1 7-8.1-8.156 5.672-4.312-1.202 15.362-7.68-3.974 14.57-3.75-3.339-2.17 2.925v-.769l-2-.56v7.383l4.473-6.031 4.527 4.031 6-22z',
      fill: this.gridColors.mainFontColor,
      stroke: this.gridColors.mainFontColor,
      strokeWidth: 0,
      viewSizeWidth: 24,
      viewSizeHeight: 24,
    },

    {
      key: 'malePicto',

      data: 'M 159.8 25 L 144.9 40 h 24.8 h 24.8 L 171 63.3 l -23.3 23.3 l -3.8 -2.4 c -8.2 -5.3 -19.8 -9.8 -30.6 -11.8 c -8.1 -1.6 -24 -1.6 -31.6 0 c -12.2 2.4 -23.2 6.9 -33.4 13.8 c -7 4.7 -18 15.6 -22.9 22.9 c -23.7 35 -19.5 81.3 10.1 111 c 16.8 16.9 38.1 25.8 61.9 25.8 c 20.7 0.1 39.4 -6.4 55.2 -19.2 c 33.8 -27.1 42.5 -75.9 20.3 -112.8 l -3.3 -5.4 l 23.3 -23.3 l 23.3 -23.3 v 24.8 v 24.8 l 14.9 -14.9 L 246 81.4 V 45.8 V 10.1 h -35.7 h -35.6 L 159.8 25 Z M 113.1 103.4 c 19.7 5.8 34.7 21.2 39.9 40.6 c 1.6 6 2.1 16.9 1.2 23 c -1.7 10.9 -7.2 22.2 -14.6 30.2 c -5.5 5.8 -10.3 9.4 -17.4 12.8 c -18.8 9 -40 7.3 -57.3 -4.4 c -10 -6.8 -18.1 -18 -22 -30 c -2.9 -9 -3.5 -17.4 -1.9 -26.3 c 2.3 -12.8 6.9 -21.7 16.1 -31 c 8.5 -8.5 17.2 -13.4 28.3 -15.8 C 93.1 100.9 105.9 101.3 113.1 103.4 Z',
      fill: this.gridColors.headerForeGroundColor,
      stroke: this.gridColors.headerForeGroundColor,
      strokeWidth: 2,
      viewSizeWidth: 256,
      viewSizeHeight: 256,
    },

    {
      key: 'femalePicto',

      data: 'M 139.2 178.7 c 0 4.6 0 9 0 11.3 c 6.6 0 48.7 0 48.7 0 v 23.4 c 0 0 -42.1 0 -48.7 0 c 0 6 0 32.6 0 32.6 h -23.9 c 0 0 0 -26.6 0 -32.6 c -6.6 0 -48.9 0 -48.9 0 V 190 c 0 0 42.3 0 48.9 0 c 0 -2.4 0 -6.9 0 -11.6 c -40.7 -6.1 -72.1 -41.3 -72.1 -83.7 C 43.3 48 81.3 10 128 10 c 46.7 0 84.7 38 84.7 84.7 C 212.7 137.7 180.6 173.2 139.2 178.7 Z M 128 33.4 c -33.8 0 -61.4 27.5 -61.4 61.4 s 27.5 61.4 61.4 61.4 c 33.8 0 61.4 -27.5 61.4 -61.4 S 161.8 33.4 128 33.4 Z',
      fill: this.gridColors.headerForeGroundColor,
      stroke: this.gridColors.headerForeGroundColor,
      strokeWidth: 4,
      viewSizeWidth: 256,
      viewSizeHeight: 256,
    },
    {
      key: 'diversSexPicto',

      data: 'M 179 177.5 l -44.1 43.7 v -55.9 h 52.6 v -13.8 h -52.6 v -19 c 30.7 -3.4 54.5 -29.4 54.5 -61 c 0 -33.9 -27.5 -61.4 -61.4 -61.4 c -33.9 0 -61.4 27.5 -61.4 61.4 c 0 31.6 23.9 57.6 54.5 61 v 19 H 68.5 v 13.8 h 52.6 v 53 L 80 177.5 l -9.8 9.8 l 49.4 49 l 0 0 l 9.7 9.7 l 0.1 -0.1 l 0.1 0.1 l 9.7 -9.7 l 0 0 l 49.5 -49 L 179 177.5 Z M 80.3 71.4 c 0 -26.3 21.3 -47.7 47.7 -47.7 s 47.7 21.3 47.7 47.7 c 0 26.3 -21.3 47.7 -47.7 47.7 S 80.3 97.7 80.3 71.4 Z',
      fill: this.gridColors.headerForeGroundColor,
      stroke: this.gridColors.headerForeGroundColor,
      strokeWidth: 5,
      viewSizeWidth: 256,
      viewSizeHeight: 256,
    },
    {
      key: 'dogPicto',

      data: 'M4.785 313.518q-13.671 -29.295 11.718 -42.966 13.671 -5.859 26.366 -1.953t18.553 13.671q19.53 31.248 57.614 50.778t69.332 19.53l314.433 0q-31.248 156.24 -27.342 296.856 -17.577 0 -49.802 -5.859t-47.849 -5.859q-27.342 -3.906 -19.53 23.436l44.919 177.723q-1.953 48.825 -39.06 54.684 -15.624 0 -31.248 -10.742t-19.53 -22.46l-56.637 -222.642q-1.953 -11.718 -12.694 -11.718t-14.648 11.718l-52.731 220.689q-9.765 35.154 -42.966 35.154 -21.483 0 -35.154 -17.577t-9.765 -37.107l64.449 -261.702 3.906 -160.146q-44.919 -11.718 -88.862 -39.06t-63.473 -64.449zm394.506 -164.052q-11.718 -21.483 7.812 -33.201 21.483 -11.718 33.201 5.859l111.321 175.77q11.718 23.436 -5.859 35.154 -23.436 9.765 -35.154 -7.812zm89.838 689.409l39.06 -160.146q1.953 -7.812 -1.953 -15.624 1.953 -185.535 25.389 -292.95 78.12 101.556 210.924 128.898 -3.906 11.718 -12.694 34.178t-12.694 32.224q-3.906 13.671 3.906 41.013 29.295 113.274 60.543 230.454 3.906 29.295 -15.624 41.013t-42.966 5.859 -29.295 -23.436l-44.919 -171.864q-9.765 -17.577 -27.342 -18.553t-23.436 18.553l-41.013 169.911q-9.765 25.389 -33.201 27.342t-41.013 -13.671 -13.671 -33.201zm95.697 -507.78l134.757 -138.663 23.436 -85.932 52.731 62.496q5.859 1.953 26.366 5.859t31.248 7.812 23.436 12.694 18.553 20.506 11.718 44.919 13.671 41.013q11.718 11.718 25.389 21.483t33.201 33.201q17.577 35.154 -48.825 70.308 -27.342 -1.953 -51.755 -5.859t-41.989 -5.859q-23.436 -3.906 -41.013 -7.812 -3.906 9.765 -6.836 21.483t-8.789 23.436q-58.59 -11.718 -113.274 -43.943t-82.026 -77.144z',
      fill: this.gridColors.mainFontColor,
      stroke: this.gridColors.mainFontColor,
      strokeWidth: 1,
      viewSizeWidth: 200,
      viewSizeHeight: 200,
    },
    {
      key: 'batonPicto',

      data: 'M161.242,180.503c38.305-38.305,128.925-128.925,128.925-128.925c9.111-9.111,9.111-23.883,0-32.994L278.416,6.833  c-9.111-9.111-23.883-9.111-32.994,0c0,0-97.4,97.4-128.925,128.925c-17.011,17.011-40.382,59.948-55.932,78.304       c-7.669,9.053-33.559,33.559-33.559,33.559l0,0c-6.178-6.178-16.195-6.178-22.373,0h0c-6.178,6.178-6.178,16.195,0,22.373 l22.373,22.373c6.178,6.178,16.195,6.178,22.373,0h0c6.178-6.178,6.178-16.195,0-22.373h0c0,0,24.506-25.89,33.559-33.559 C101.294,220.885,144.231,197.514,161.242,180.503z',
      fill: this.gridColors.mainFontColor,
      stroke: this.gridColors.mainFontColor,
      strokeWidth: 1,
      viewSizeWidth: 297,
      viewSizeHeight: 297,
    },
    {
      key: 'gunPicto',

      data: 'M19.431 8.657c-1.391-.155-2.937-1.369-3.532-2.653h-7.899v5.113c2.798 0 1.686 3.634 4.996 4.146 1.988.307 3.258-.694 3.381-1.93.198-1.974 1.331-3.725 3.054-4.676zm-9.122-1.699h3.561c.189 0 .343.153.343.343 0 .189-.153.342-.343.342h-3.561v-.685zm0 1.287h3.561c.189 0 .343.153.343.342 0 .189-.153.342-.343.342h-3.561v-.684zm0 1.971v-.685h3.561c.189 0 .343.153.343.343 0 .189-.153.342-.343.342h-3.561zm3.125 4.257c-2.814-.28-2.644-3.545.518-3.057 2.192.34 2.045 3.312-.518 3.057zm-6.434-8.469v2.996h-6.014c-.06-.491-.35-1.006-.986-1.157v-1.839h7zm-4-.734h-2.297v-1.031c0-.188.188-.3.366-.204l1.931 1.235zm14.81 2.07c-.247-.179-.479-.38-.702-.618.529-.297 1.027-.494 1.681-.542.241-.018.349.273.107.376-.486.208-.818.413-1.086.784zm-3.033 5.293c-.326.57-.875 1.146-1.341 1.184-.145.012-.244-.123-.188-.253.107-.247.778-.745.622-1.552.492.08.783.331.907.621zm5.29-3.16c-1.557.802-2.597 2.354-2.738 4.11.777.323 1.671.917 1.671 2.938v2.465c0 .847.34 1.014 1.216 1.014h2.493c.99 0 1.291-.309 1.291-.999 0-1.527-.396-3.828-1.997-6.079-.782-1.101-1.803-1.85-1.936-3.449zm-.63 3.973c-.391 0-.707-.316-.707-.708s.316-.708.707-.708.708.316.708.708-.318.708-.708.708z',
      fill: this.gridColors.mainFontColor,
      stroke: this.gridColors.mainFontColor,
      strokeWidth: 1,
      viewSizeWidth: 24,
      viewSizeHeight: 24,
    },
    {
      key: 'govermentPicto',

      data: 'M7 21h-4v-11h4v11zm7-11h-4v11h4v-11zm7 0h-4v11h4v-11zm2 12h-22v2h22v-2zm-23-13h24l-12-9-12 9z',
      fill: this.gridColors.mainFontColor,
      stroke: this.gridColors.mainFontColor,
      strokeWidth: 1,
      viewSizeWidth: 24,
      viewSizeHeight: 24,
    },
  ];

  reset(width: number, height: number) {
    this._width = width;
    this._height = height;

    this._filterPicto = undefined;
    this._palmtreePicto = undefined;
    this._gearPicto = undefined;
    this._paperClipPicto = undefined;
    this._paperPlaneExpiredPicto = undefined;
    this._paperPlanePicto = undefined;
    this._malePicto = undefined;
    this._femalePicto = undefined;
    this._diversSexPicto = undefined;
    this._dogPicto = undefined;
    this._batonPicto = undefined;
    this._gunPicto = undefined;
    this._govermentPicto = undefined;
  }

  get filterPicto(): HTMLCanvasElement | undefined {
    if (this._filterPicto === undefined) {
      this._filterPicto = this.createPicto('filterPicto');
    }
    return this._filterPicto;
  }

  get palmtreePicto(): HTMLCanvasElement | undefined {
    if (this._palmtreePicto === undefined) {
      this._palmtreePicto = this.createPicto('palmtreePicto');
    }
    return this._palmtreePicto;
  }

  get gearPicto(): HTMLCanvasElement | undefined {
    if (this._gearPicto === undefined) {
      this._gearPicto = this.createPicto('gearPicto');
    }
    return this._gearPicto;
  }

  get paperClipPicto(): HTMLCanvasElement | undefined {
    if (this._paperClipPicto === undefined) {
      this._paperClipPicto = this.createPicto('paperClipPicto');
    }
    return this._paperClipPicto;
  }

  get paperPlaneExpiredPicto(): HTMLCanvasElement | undefined {
    if (this._paperPlaneExpiredPicto === undefined) {
      this._paperPlaneExpiredPicto = this.createPicto('paperPlaneExpiredPicto');
    }

    return this._paperPlaneExpiredPicto;
  }

  get paperPlanePicto(): HTMLCanvasElement | undefined {
    if (this._paperPlanePicto === undefined) {
      this._paperPlanePicto = this.createPicto('paperPlanePicto');
    }

    return this._paperPlanePicto;
  }

  get malePicto(): HTMLCanvasElement | undefined {
    if (this._malePicto === undefined) {
      this._malePicto = this.createPicto('malePicto');
    }

    return this._malePicto;
  }

  get diversSexPicto(): HTMLCanvasElement | undefined {
    if (this._diversSexPicto === undefined) {
      this._diversSexPicto = this.createPicto('diversSexPicto');
    }

    return this._diversSexPicto;
  }

  get femalePicto(): HTMLCanvasElement | undefined {
    if (this._femalePicto === undefined) {
      this._femalePicto = this.createPicto('femalePicto');
    }

    return this._femalePicto;
  }

  get dogPicto(): HTMLCanvasElement | undefined {
    if (this._dogPicto === undefined) {
      this._dogPicto = this.createPicto('dogPicto');
    }

    return this._dogPicto;
  }

  get batonPicto(): HTMLCanvasElement | undefined {
    if (this._batonPicto === undefined) {
      this._batonPicto = this.createPicto('batonPicto');
    }

    return this._batonPicto;
  }

  get gunPicto(): HTMLCanvasElement | undefined {
    if (this._gunPicto === undefined) {
      this._gunPicto = this.createPicto('gunPicto');
    }

    return this._gunPicto;
  }

  get govermentPicto(): HTMLCanvasElement | undefined {
    if (this._govermentPicto === undefined) {
      this._govermentPicto = this.createPicto('govermentPicto');
    }

    return this._govermentPicto;
  }

  private createPicto(picto: string): HTMLCanvasElement | undefined {
    const search = this.dataArray.find((x) => x.key === picto);

    if (search) {
      const result = DrawHelper.createSVG(
        search.data,
        search.fill,
        search.stroke,
        this._defaultBackGroundColor,
        this._width,
        this._height,
        search.strokeWidth,
        search.viewSizeWidth,
        search.viewSizeHeight
      );

      return result;
    }
    return undefined;
  }
}
