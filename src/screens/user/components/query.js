import {useContext, useReducer, useEffect, useRef} from 'react'
import PropTypes from 'prop-types'
import isEqual from 'lodash/isEqual'
import * as GitHub from '../../../github-client'

//setState is our dispatch
// our first arg of useReducer is our reducer (in this case, there arent any action type cases)
function useSetState(initialState) {
  return useReducer(
    (state, newState) => ({...state, ...newState}),
    initialState,
  )
}

// refactor the mounted reference that we set in componentDidMount/Unmount
// we do this because our network API doesn't properly cancel requests, which
// could result in an incomplete request on an already unmounted component
function useSafeSetState(initialState) {
  const [state, setState] = useSetState(initialState)

  const mountedRef = useRef(false)
  useEffect(() => {
    mountedRef.current = true
    // our cleanup, when the component unmounts will set our 'unmount' ref
    return () => (mountedRef.current = false)
    //empty depedency array means it only runs once, on mount
  }, [])

  const safeSetState = (...args) => mountedRef.current && setState(...args)
  return [state, safeSetState]
}

function usePrevious(value) {
  const ref = useRef()
  useEffect(() => {
    ref.current = value
  })
  return ref.current
}

function useDeepCompareEffect(callback, inputs) {
  const cleanupRef = useRef()
  useEffect(() => {
    if (!isEqual(previousInputs, inputs)) {
      cleanupRef.current = callback()
    }
    return cleanupRef.current
  })
  const previousInputs = usePrevious(inputs)
}

// functional note: we pass our props into the function so they're immutable for the scope of our instance
function useQuery({query, variables, normalize = data => data}) {
  const client = useContext(GitHub.Context)
  const [state, setState] = useSafeSetState({
    loaded: false,
    fetching: false,
    data: null,
    error: null,
  })

  // replace componentDidMount/Update query() call
  // we need to run a deep object comparison to eject out of our hook when necessary
  // or, since we're passing in an object for query/variables, we need to make sure they're different
  useDeepCompareEffect(
    () => {
      setState({fetching: true})

      client
        .request(query, variables)
        .then(res =>
          setState({
            data: normalize(res),
            error: null,
            loaded: true,
            fetching: false,
          }),
        )
        .catch(error =>
          setState({
            error,
            data: null,
            loaded: false,
            fetching: false,
          }),
        )
    },
    [query, variables],
  )

  //remove returning children prop w/ state here, and instead, just return state
  // render props version below will include children
  return state
}

//we still have some areas of the application that need to havea rende prop-based API
// so we still provide that version of our API
const Query = ({children, ...props}) => children(useQuery(props))

Query.propTypes = {
  query: PropTypes.string.isRequired,
  variables: PropTypes.object,
  children: PropTypes.func.isRequired,
  normalize: PropTypes.func,
}

export default Query
export {useQuery}
