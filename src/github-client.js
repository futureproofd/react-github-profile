import React from 'react'
import netlify from 'netlify-auth-providers'
import {css} from 'react-emotion'
import {PrimaryButton} from './shared/pattern'
import {GraphQLClient} from 'graphql-request'

const GitHubClientContext = React.createContext()

async function authWithGitHub() {
  return new Promise((resolve, reject) => {
    var authenticator = new netlify({
      site_id: '2b9c1652-1f15-4c58-89f2-290796d9fc68',
    })
    authenticator.authenticate(
      {provider: 'github', scope: 'public_repo,read:org,read:user'},
      function(err, data) {
        if (err) {
          reject(err)
        }
        resolve(data)
      },
    )
  })
}

class GitHubClientProvider extends React.Component {
  state = {client: this.props.client, error: null}
  getClient = token => {
    const headers = {Authorization: `bearer ${token}`}
    const client = new GraphQLClient('https://api.github.com/graphql', {
      headers,
    })
    return Object.assign(client, {
      login: this.login,
      logout: this.logout,
    })
  }
  componentDidMount() {
    const token =
      window.localStorage.getItem('github-token') ||
      process.env.REACT_APP_GITHUB_TOKEN
    if (token && !this.state.client) {
      this.setState({client: this.getClient(token)})
    }
  }
  logout = () => {
    window.localStorage.removeItem('github-token')
    this.setState({client: null, error: null})
  }
  login = async () => {
    const data = await authWithGitHub().catch(error => {
      console.log('Oh no', error)
      this.setState({error})
    })
    window.localStorage.setItem('github-token', data.token)
    this.setState({client: this.getClient(data.token)})
  }
  render() {
    const {client, error} = this.state
    const {children} = this.props

    return client ? (
      <GitHubClientContext.Provider value={client}>
        {children}
      </GitHubClientContext.Provider>
    ) : (
      <div
        className={css({
          marginTop: 250,
          display: 'flex',
          justifyContent: 'center',
        })}
      >
        {error ? (
          <div>
            <p>Oh no! Error!</p>
            <pre>{JSON.stringify(error, null, 2)}</pre>
          </div>
        ) : (
          <div>
            <PrimaryButton onClick={this.login}>
              Login with GitHub
            </PrimaryButton>
          </div>
        )}
      </div>
    )
  }
}

const {Consumer} = GitHubClientContext

export {
  GitHubClientProvider as Provider,
  Consumer,
  GitHubClientContext as Context,
}