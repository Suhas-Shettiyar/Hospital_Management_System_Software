
    export type RemoteKeys = 'opd_remote/module';
    type PackageType<T> = T extends 'opd_remote/module' ? typeof import('opd_remote/module') :any;