"""Example package/module.

In the full design, each department (OPD, Lab, Pharmacy, ...) is a package like
this one: it exposes an APIRouter, its own models, and a manifest. The core
loader mounts enabled packages. Here we show the router pattern only.
"""
