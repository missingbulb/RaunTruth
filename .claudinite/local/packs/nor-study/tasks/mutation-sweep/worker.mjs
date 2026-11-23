import { spawnSync } from 'node:child_process';
import { fail, requestAgent } from '@claudinite/sdk';

const FROZEN = 3;
const NO_STUDY_FILE_ID = 2;

export async function worker({ root, log }) {
  const stage = spawnSync('python3', ['lab/stage.py', 'nor', '--stop-if-frozen'], { cwd: root, encoding: 'utf8' });
  if (stage.status === FROZEN) {
    log(stage.stdout.trim());
    return;
  }
  // without the study file's id here the stage is the agent's to read, where the environment holds it
  if (stage.status === NO_STUDY_FILE_ID) return requestAgent({ reason: 'the stage is read in the agent session' });
  if (stage.status !== 0) fail('failure', stage.stderr.trim());
  return requestAgent({ reason: 'the study is not frozen' });
}
