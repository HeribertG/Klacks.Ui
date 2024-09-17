export interface IBaseEntity {
  createTime: Date | undefined;
  currentUserCreated: string | undefined;
  updateTime: Date | undefined;
  currentUserUpdated: string | undefined;
  isDeleted: boolean;
  deletedTime: Date | undefined;
  currentUserDeleted: string | undefined;
}

export class BaseEntity implements IBaseEntity {
  isDeleted = false;
  createTime = undefined;
  currentUserCreated = undefined;
  updateTime = undefined;
  currentUserUpdated = undefined;
  deletedTime = undefined;
  currentUserDeleted = undefined;
}

export interface IBaseFilter {
  searchString: string | undefined;
  orderBy: string;
  sortOrder: string;
  numberOfItemsPerPage: number;
  requiredPage: number;
  firstItemOnLastPage: number | undefined;
  numberOfItemOnPreviousPage: number | undefined;
  isPreviousPage: boolean | undefined;
  isNextPage: boolean | undefined;
}

export class BaseFilter implements IBaseFilter {
  searchString = '';
  orderBy = 'name';
  sortOrder = 'asc';
  numberOfItemsPerPage = 0;
  requiredPage = 0;
  numberOfItemOnPreviousPage: number | undefined = undefined;
  firstItemOnLastPage: number | undefined = undefined;
  isPreviousPage: boolean | undefined = undefined;
  isNextPage: boolean | undefined = undefined;
}

export interface IBaseTruncated {
  maxItems: number;
  maxPages: number;
  currentPage: number;
  firstItemOnPage: number;
}

export class BaseTruncated implements IBaseTruncated {
  maxItems = 0;
  maxPages = 0;
  currentPage = 1;
  firstItemOnPage = 0;
}

export interface IStandartType extends IBaseEntity {
  id: string | undefined;
  name: string;
  position: number;
}

export class StandartType extends BaseEntity implements IStandartType {
  id = undefined;
  name = '';
  position = 0;
}
