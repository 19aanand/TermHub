"""
Fully refresh the database with the latest data from the enclave API.
  here's what the run file is doing, i think, for datasets:
    ./venv/bin/python enclave_wrangler/datasets.py -f -o termhub-csets/datasets/downloads

TODO: Replace this with objects API implementation
TODO: Replace DB backup steps: replace renames at end of script w/ dump commands in `/db_backup.sh`
"""
import os
import sys
from argparse import ArgumentParser

from datetime import datetime

DB_DIR = os.path.dirname(os.path.realpath(__file__))
BACKEND_DIR = os.path.join(DB_DIR, '..')
PROJECT_ROOT = os.path.join(BACKEND_DIR, '..')
sys.path.insert(0, str(PROJECT_ROOT))
from backend.db.config import CONFIG
from backend.db.load import load
from backend.db.utils import check_if_updated, current_datetime, get_db_connection, run_sql, update_db_status_var
from enclave_wrangler.datasets import download_favorite_datasets
from enclave_wrangler.objects_api import download_favorite_objects


# todo: low priority: track the time it takes for this process to run, and then update the `manage` table, 2 variables:
#  total time for downloads, and total time for uploading to db (perhaps for each table as well)
def refresh_db(
    skip_download_datasets_csets=False, skip_download_datasets_vocab=False, skip_download_objects=False,
    force_download_if_exists=True, schema: str = CONFIG['schema'], hours_threshold_for_updates=24,
    use_local_database=False
):
    """Refresh the database"""
    print('INFO: Starting database refresh.', flush=True)  # flush: for gh action
    schema_new_temp = schema + '_' + datetime.now().strftime('%Y%m%d')
    schema_old_backup = schema + '_before_' + schema_new_temp.replace(schema + '_', '')
    last_updated_db_key = 'last_updated_DB'
    hours_threshold_for_updates = int(hours_threshold_for_updates)
    is_updated = check_if_updated(last_updated_db_key, hours_threshold_for_updates)

    # Downloads
    # todo: Might be useful to add last_updated functionality on a more granular basis based on each of these 3.
    #  Maybe we want to do downloads even if the uploads have been complete?
    if not is_updated and not skip_download_datasets_csets:
        print('INFO: Downloading datasets: csets.')
        download_favorite_datasets(force_if_exists=force_download_if_exists, single_group='cset')
    if not is_updated and not skip_download_objects:
        print('INFO: Downloading datasets: objects.')
        download_favorite_objects(force_if_exists=force_download_if_exists)
    if not is_updated and not skip_download_datasets_vocab:
        print('INFO: Downloading datasets: vocab.')
        download_favorite_datasets(force_if_exists=force_download_if_exists, single_group='vocab')
    if is_updated:
        print('INFO: Skipping download of datasets and skip_download_objects as they are up to date.')

    # Uploads
    if not is_updated:
        with get_db_connection(local=use_local_database) as con:
            run_sql(con, f'CREATE SCHEMA IF NOT EXISTS {schema_new_temp};')
        load(schema_new_temp, True, hours_threshold_for_updates, use_local_database)
        with get_db_connection(schema=schema_new_temp, local=use_local_database) as con:
            run_sql(con, f'ALTER SCHEMA n3c RENAME TO {schema_old_backup};')
            run_sql(con, f'ALTER SCHEMA {schema_new_temp} RENAME TO n3c;')
            update_db_status_var(last_updated_db_key, str(current_datetime()))
    else:
        print('INFO: Skipping upload of latest datasets to DB as it is up to date.')
    print('INFO: Database refresh complete.')


def cli():
    """Command line interface"""
    parser = ArgumentParser(description='Refreshes the TermHub database w/ newest updates from the Enclave.')
    parser.add_argument(
        '-t', '--hours-threshold-for-updates', default=24,
        help='Threshold for how many hours since last update before we require refreshes. If last update time was less '
             'than this, nothing will happen. Will evaluate this separately for downloads of local artefacts as well '
             'as uploading data to the DB.')
    parser.add_argument(
        '-o', '--skip-download-objects', action='store_true', default=False, help='Skip download of objects.')
    parser.add_argument(
        '-c', '--skip-download-datasets-csets', action='store_true', default=False,
        help='Skip download datasets from the "cset" group.')
    parser.add_argument(
        '-v', '--skip-download-datasets-vocab', action='store_true', default=False,
        help='Skip download datasets from the "vocab" group.')
    parser.add_argument(
        '-f', '--force-download-if-exists', action='store_true', default=True,
        help='If the dataset/object already exists as a local file, force a re-download. This is moot if the last '
             'update was done within --hours-threshold-for-updates.')
    parser.add_argument(
        '-l', '--use-local-database', action='store_true', default=False, help='Use local database instead of server.')
    refresh_db(**vars(parser.parse_args()))


if __name__ == '__main__':
    cli()
