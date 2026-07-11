let _cz = null;

export const setCz = (instance) => { _cz = instance; };

export const czError = (message, metadata) => { _cz?.error(message, metadata); };
