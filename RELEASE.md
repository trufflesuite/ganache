# Ganache Release Process

### Generate release notes

Run `npm run make-release-notes` inside of the root directory of `ganache` to generate the release notes. Write the preamble and highlights, and fill in any extra necessary details.

In Github, go to Releases => Draft a New Release and paste in the generated markdown. Click Save Draft, copy the link to the draft, and share it on the Ganash slack channel for the team's input. Note that Github is silly and makes a new link to the draft every time it's edited. If you have review comments and make a fix, you'll need to reshare the link so others can access it.

NOTE: With the current state of the automated release notes, `gh` will need to be installed by the user running the project. Use `npm i gh` or `npm i gh -g`.

### Create merge PR

In Github, go to Pull Requests => New Pull Request. Set the base branch to the release branch\* and set the compare branch to `develop`. Click Create Pull Request, and name the PR as `Release vX.x.x` for a stable release or `Release vX.x.x-tag.x` for rc, beta, or alpha releases.

Once the PR is made, your next to-do's are:

1.  Request reviewers
1.  Rerun actions until all tests pass and we have all green checks
1.  Confirm the number of additions/deletions/commits match what is written in the release notes.

If the above items are complete, you're ready to merge the PR!
**NOTE: The merge should NOT be squashed. Since we usually squash merges of Ganache PRs, be sure that Create a merge commit is selected before merging.**

Leave merge commit subject as `Merge pull request #XXXX from trufflesuite/develop` and the description as the PR title.

Now Confirm Merge already! Next:

1. Go to the Actions tab in Github. Fearfully watch the release action, hoping it runs to completion.

### Post PR Merge

Once the PR has been merged and the release action has completed, perform the following checks.

1. Confirm publish to npm

```console
npm uninstall -g ganache
npm install -g ganache
ganache
```

Check that the correct, latest version of ganache has been installed. 2. Confirm publish to docker

```console
docker pull trufflesuite/ganache:latest
docker run --publish 8545:8545 trufflesuite/ganache:latest
```

Check that the correct, latest version of ganache is running.

### Create Release Tag

**This section should be automated and removed**
If we released to master, we now need to merge from master back into develop:

```console
git fetch
git checkout master
git pull
git tag -a "vX.x.x" -m "vX.x.x"
git push origin vX.x.x
git checkout develop
git merge master
git push origin develop
```

### Publish Release Notes

On the draft release notes, select the tag that was just created.
Create a discussion with category "Releases" and click Publish Release!
